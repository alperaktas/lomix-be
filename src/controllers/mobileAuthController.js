const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const emailQueue = require('../utils/emailQueue');
const SocialAuthLog = require('../models/SocialAuthLog');
const { OAuth2Client } = require('google-auth-library');

// HTML Şablonunu okuyup değişkenleri değiştiren yardımcı fonksiyon
const getEmailTemplate = (templateName, replacements) => {
    const templatePath = path.join(__dirname, '../views/emails', `${templateName}.html`);
    let html = fs.readFileSync(templatePath, 'utf8');
    for (const key in replacements) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), replacements[key]);
    }
    return html;
};

exports.register = async (req, res) => {
    try {
        const User = sequelize.models.User;
        const { username, email, password, gender, deviceModel, phone } = req.body;

        // 1. Zorunlu alan kontrolü
        if (!username || !email || !password) {
            return res.status(400).json({
                error_code: 'VALIDATION_ERROR',
                message: 'Kullanıcı adı, e-posta ve şifre zorunludur.'
            });
        }

        // 2. Kullanıcı var mı kontrolü
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ email }, { username }]
            }
        });

        if (existingUser) {
            return res.status(409).json({
                error_code: 'USER_ALREADY_EXISTS',
                message: 'Bu kullanıcı adı veya e-posta zaten kullanımda.'
            });
        }

        // 3. IP ve UserAgent bilgilerini al
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // 4. Şifreleme
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. 4 Haneli Rastgele Doğrulama Kodu (1000 - 9999 arası)
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        // 5. Kayıt oluşturma
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            gender,
            deviceModel,
            phone,
            ipAddress,
            userAgent,
            role: 'user', // Mobil kayıtlar varsayılan olarak 'user' olur
            status: 'pending', // Onay bekliyor
            verificationCode: verificationCode
        });

        // 6. Email Gönderimi (Loglama)
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const logoUrl = `${baseUrl}/img/logo.png`;

        const htmlContent = getEmailTemplate('verification', {
            username: username,
            verificationCode: verificationCode,
            logoUrl: logoUrl
        });

        // Kuyruğa ekle (await kullanmıyoruz, arka planda çalışacak)
        emailQueue.add(
            email,
            'Lomix - Üyelik Doğrulama',
            `Merhaba ${username}, Doğrulama kodunuz: ${verificationCode}`,
            htmlContent
        );

        res.status(201).json({
            message: 'Kayıt başarılı. Doğrulama kodu e-posta adresinize gönderildi.',
            userId: newUser.id,
            status: 'pending'
        });
    } catch (error) {
        console.error("Mobil Kayıt Hatası:", error);
        try {
            await sequelize.models.Log.create({
                level: 'error',
                message: `Mobil Kayıt Hatası: ${req.body.email || 'Bilinmiyor'}`,
                meta: JSON.stringify({ error: error.message, stack: error.stack })
            });
        } catch (logErr) { console.error("Loglama hatası:", logErr); }

        res.status(500).json({
            error_code: 'SERVER_ERROR',
            message: error.message || 'Sunucu hatası'
        });
    }
};

exports.verify = async (req, res) => {
    try {
        const User = sequelize.models.User;
        const { email, code, type } = req.body; // type: 'activation' (varsayılan) veya 'reset_password'

        if (!email || !code) {
            return res.status(400).json({
                error_code: 'VALIDATION_ERROR',
                message: 'E-posta ve doğrulama kodu zorunludur.'
            });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ error_code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' });
        }

        // Debug için loglama: Gelen kod ve DB'deki kodu karşılaştırmak için
        console.log(`Doğrulama Kontrolü (${type || 'activation'}) - Email: ${email}, Gelen Kod: '${code}'`);

        // Eğer type 'reset_password' ise veya belirtilmemişse ama kullanıcı zaten aktifse (şifre sıfırlama varsayılır)
        if (type === 'reset_password' || (!type && user.status === 'active')) {
            // --- ŞİFRE SIFIRLAMA KODU KONTROLÜ ---
            if (!user.resetPasswordCode) {
                return res.status(400).json({ error_code: 'CODE_NOT_FOUND', message: 'Şifre sıfırlama talebi bulunamadı.' });
            }

            if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
                return res.status(400).json({ error_code: 'CODE_EXPIRED', message: 'Kodun süresi dolmuş.' });
            }

            if (String(user.resetPasswordCode).trim() !== String(code).trim()) {
                return res.status(400).json({ error_code: 'INVALID_CODE', message: 'Geçersiz doğrulama kodu.' });
            }

            return res.json({ message: 'Kod doğrulandı.' });
        } else {
            // --- HESAP AKTİVASYONU (Varsayılan) ---
            if (user.status === 'active') {
                return res.status(200).json({ message: 'Hesap zaten doğrulanmış.' });
            }

            // Veritabanından gelen kod sayısal olabilir, string'e çevirip karşılaştırıyoruz
            if (String(user.verificationCode).trim() !== String(code).trim()) {
                return res.status(400).json({ error_code: 'INVALID_CODE', message: 'Geçersiz doğrulama kodu.' });
            }

            await user.update({ status: 'active', verificationCode: null });
            return res.json({ message: 'Hesap başarıyla doğrulandı ve aktif edildi.' });
        }
    } catch (error) {
        try {
            await sequelize.models.Log.create({
                level: 'error',
                message: `Mobil Doğrulama Hatası: ${req.body.email || 'Bilinmiyor'}`,
                meta: JSON.stringify({ error: error.message, stack: error.stack })
            });
        } catch (logErr) { console.error("Loglama hatası:", logErr); }

        res.status(500).json({ error_code: 'SERVER_ERROR', message: error.message });
    }
};

// Sosyal Medya Login İşlemleri için Yardımcı Fonksiyon
const handleSocialAuth = async (req, res, provider) => {
    let logEntry;
    const User = sequelize.models.User;

    try {
        // req.body undefined gelirse patlamaması için önlem
        const { token, deviceInfo } = req.body || {};
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        if (!token) {
            return res.status(400).json({
                error_code: 'VALIDATION_ERROR',
                message: 'Token bilgisi gönderilmedi. Lütfen Content-Type: application/json başlığını ve JSON verisini kontrol edin.'
            });
        }

        // 1. Gelen isteği logla
        logEntry = await SocialAuthLog.create({
            provider: provider,
            incomingRequest: JSON.stringify(req.body || {}),
            ipAddress: ipAddress,
            userAgent: userAgent || deviceInfo
        });

        let socialUser = {};

        // 2. Provider'a göre doğrulama
        if (provider === 'google') {
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

            // Birden fazla Client ID desteği (Web, Android, iOS)
            const audiences = [
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_ANDROID_CLIENT_ID,
                process.env.GOOGLE_IOS_CLIENT_ID
            ].filter(id => id && id.trim() !== '');

            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: audiences.length > 0 ? audiences : process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            socialUser = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                sub: payload.sub
            };

            await logEntry.update({
                verificationRequest: 'Google verifyIdToken',
                providerResponse: JSON.stringify(payload)
            });
        } else {
            // Diğer sağlayıcılar için şimdilik dummy (Facebook/Apple)
            // Buraya ilgili SDK entegrasyonları eklenebilir
            socialUser = {
                email: "dummy@example.com",
                name: "Dummy User",
                picture: "",
                sub: "dummy_id"
            };
        }

        // 3. Veritabanında Kullanıcıyı Bul veya Oluştur
        let user = await User.findOne({ where: { email: socialUser.email } });

        if (!user) {
            // Rastgele şifre oluştur
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            // Benzersiz kullanıcı adı oluştur
            const baseUsername = socialUser.name || socialUser.email.split('@')[0];
            const uniqueUsername = `${baseUsername.replace(/\s+/g, '')}_${Math.floor(Math.random() * 10000)}`;

            user = await User.create({
                username: uniqueUsername,
                email: socialUser.email,
                password: hashedPassword,
                role: 'user',
                status: 'active', // Sosyal medya ile gelen kullanıcı onaylı sayılır
                avatar: socialUser.picture
            });
        } else {
            if (user.status === 'suspended') {
                throw new Error('Hesabınız askıya alınmıştır.');
            }
            // Kullanıcı zaten varsa ve sosyal medyadan gelen avatar farklıysa güncelle
            if (socialUser.picture && user.avatar !== socialUser.picture) {
                await user.update({ avatar: socialUser.picture });
            }
        }

        // 4. JWT Token Üret
        const appToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli',
            { expiresIn: '30d' }
        );

        const appResponse = {
            message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} ile giriş başarılı.`,
            token: appToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        };

        // Log güncelle: Uygulamaya dönülen cevap
        await logEntry.update({ appResponse: JSON.stringify(appResponse) });

        res.json(appResponse);

    } catch (error) {
        console.error(`${provider} Auth Error:`, error);

        // Google Audience hatası için detaylı log
        if (provider === 'google' && error.message.includes('audience')) {
            const decoded = jwt.decode(req.body?.token);
            console.error(`⚠️ Google Token Audience Uyuşmazlığı!`);
            console.error(`Beklenenler: ${[process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean).join(', ')}`);
            console.error(`Gelen Token 'aud': ${decoded?.aud}`);
            console.error(`Çözüm: .env dosyasına GOOGLE_ANDROID_CLIENT_ID veya GOOGLE_IOS_CLIENT_ID ekleyerek gelen 'aud' değerini tanımlayın.`);
        }

        if (logEntry) {
            await logEntry.update({
                errorMessage: error.message,
                appResponse: JSON.stringify({ error_code: 'SERVER_ERROR', message: error.message })
            });
        }
        res.status(500).json({ error_code: 'SERVER_ERROR', message: error.message });
    }
};

exports.googleAuth = async (req, res) => handleSocialAuth(req, res, 'google');
exports.facebookAuth = async (req, res) => handleSocialAuth(req, res, 'facebook');
exports.appleAuth = async (req, res) => handleSocialAuth(req, res, 'apple');
exports.getQueueStatus = (req, res) => {
    res.json(emailQueue.getStats());
};

exports.login = async (req, res) => {
    try {
        const User = sequelize.models.User;
        const UserLog = sequelize.models.UserLog;
        const Log = sequelize.models.Log;
        const { email, password, deviceInfo } = req.body;
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 1. Validasyon
        if (!email || !password) {
            return res.status(400).json({
                error_code: 'VALIDATION_ERROR',
                message: 'Lütfen email ve şifre giriniz.'
            });
        }

        // 2. Kullanıcıyı Bulma
        const user = await User.findOne({ where: { email } });

        // Güvenlik: Kullanıcı yoksa veya şifre yanlışsa genel hata dön
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                error_code: 'AUTH_FAILED',
                message: 'Email adresi veya şifre hatalı.'
            });
        }

        // 3. Token Oluşturma
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli',
            { expiresIn: '30d' } // Mobil için uzun ömürlü token
        );

        // 4. Loglama (ORM Kullanarak user_logs tablosuna)
        if (UserLog) {
            await UserLog.create({
                userId: user.id,
                action: 'LOGIN_MOBILE',
                ipAddress: ipAddress,
                userAgent: deviceInfo || req.headers['user-agent'] || 'Unknown Mobile'
            });
        }

        // 5. Genel Sistem Logu (AI ve Analiz için logs tablosuna)
        if (Log) {
            await Log.create({
                level: 'info',
                message: `Mobil Giriş: ${user.email}`,
                meta: JSON.stringify({
                    userId: user.id,
                    ip: ipAddress,
                    device: deviceInfo
                })
            });
        }

        // 6. Normal Log (Konsol)
        console.log(`[Mobil Login] User: ${user.email}, IP: ${ipAddress}, Device: ${deviceInfo}`);

        // 7. Başarılı Yanıt
        res.json({
            message: 'Giriş başarılı.',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error("Mobil Login Hatası:", error);
        try {
            await sequelize.models.Log.create({
                level: 'error',
                message: `Mobil Login Hatası: ${req.body.email || 'Bilinmiyor'}`,
                meta: JSON.stringify({ error: error.message, stack: error.stack })
            });
        } catch (logErr) { console.error("Loglama hatası:", logErr); }

        res.status(500).json({ error_code: 'SERVER_ERROR', message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const User = sequelize.models.User;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error_code: 'VALIDATION_ERROR', message: 'E-posta adresi zorunludur.' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ error_code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' });
        }

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 3600000); // 1 saat geçerli

        await user.update({ resetPasswordCode: code, resetPasswordExpires: expires });

        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const logoUrl = `${baseUrl}/img/logo.png`;

        const htmlContent = getEmailTemplate('reset-password', {
            resetCode: code,
            logoUrl: logoUrl
        });

        emailQueue.add(
            email,
            'Lomix - Şifre Sıfırlama',
            `Şifre sıfırlama kodunuz: ${code}`,
            htmlContent
        );

        res.json({ message: 'Şifre sıfırlama kodu e-posta adresinize gönderildi.' });
    } catch (error) {
        try {
            await sequelize.models.Log.create({
                level: 'error',
                message: `Şifre Unuttum Hatası: ${req.body.email || 'Bilinmiyor'}`,
                meta: JSON.stringify({ error: error.message, stack: error.stack })
            });
        } catch (logErr) { console.error("Loglama hatası:", logErr); }

        res.status(500).json({ error_code: 'SERVER_ERROR', message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const User = sequelize.models.User;
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error_code: 'VALIDATION_ERROR', message: 'E-posta, kod ve yeni şifre zorunludur.' });
        }

        const user = await User.findOne({
            where: {
                email,
                resetPasswordCode: code,
                resetPasswordExpires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error_code: 'INVALID_CODE', message: 'Geçersiz veya süresi dolmuş kod.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword, resetPasswordCode: null, resetPasswordExpires: null });

        res.json({ message: 'Şifreniz başarıyla güncellendi.' });
    } catch (error) {
        try {
            await sequelize.models.Log.create({
                level: 'error',
                message: `Şifre Sıfırlama Hatası: ${req.body.email || 'Bilinmiyor'}`,
                meta: JSON.stringify({ error: error.message, stack: error.stack })
            });
        } catch (logErr) { console.error("Loglama hatası:", logErr); }

        res.status(500).json({ error_code: 'SERVER_ERROR', message: error.message });
    }
};

exports.logout = async (req, res) => {
    try {
        const UserLog = sequelize.models.UserLog;
        const Log = sequelize.models.Log;
        // authMiddleware sayesinde req.user dolu gelir
        const userId = req.user ? req.user.id : null;
        const email = req.user ? req.user.email : 'Unknown';
        const { deviceInfo } = req.body;
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 1. User Log (Kullanıcı Hareketleri)
        if (UserLog && userId) {
            await UserLog.create({
                userId: userId,
                action: 'LOGOUT_MOBILE',
                ipAddress: ipAddress,
                userAgent: deviceInfo || req.headers['user-agent'] || 'Unknown Mobile'
            });
        }

        // 2. Sistem Logu (AI/Analiz)
        if (Log) {
            await Log.create({
                level: 'info',
                message: `Mobil Çıkış: ${email}`,
                meta: JSON.stringify({ userId, ip: ipAddress, device: deviceInfo })
            });
        }

        res.json({ message: 'Başarıyla çıkış yapıldı.' });
    } catch (error) {
        console.error("Mobil Logout Hatası:", error);
        // Hata loglama (Sessiz)
        try { await sequelize.models.Log.create({ level: 'error', message: `Mobil Logout Hatası`, meta: JSON.stringify({ error: error.message }) }); } catch (e) { }
        res.status(500).json({ error_code: 'SERVER_ERROR', message: error.message });
    }
};
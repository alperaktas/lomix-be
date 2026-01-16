const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

// Model server.js'de init edildiği için sequelize.models üzerinden erişiyoruz

exports.login = async (req, res) => {
    try {
        console.log("Login İsteği Body:", req.body); // Gelen veriyi konsolda görmek için

        const { email, username, password } = req.body;
        const User = sequelize.models.User;
        const UserLog = sequelize.models.UserLog;
        const identifier = email || username; // İkisinden biri varsa yeterli

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Email/Kullanıcı adı ve şifre zorunludur.' });
        }

        if (!User) {
            return res.status(500).json({ message: 'User model not initialized' });
        }

        // Kullanıcıyı bul
        const user = await User.findOne({
            where: {
                [Op.or]: [{ email: identifier }, { username: identifier }]
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        // Kullanıcı durumu kontrolü
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Hesabınız askıya alınmıştır. Lütfen yönetici ile iletişime geçin.' });
        }

        // Onay bekleyen kullanıcıların girişini engelle
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Hesabınız henüz onaylanmamıştır.' });
        }

        // Şifre kontrolü
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Hatalı şifre' });
        }

        // Token oluştur (Secret key .env'den gelmeli, yoksa varsayılan kullanılır)
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli',
            { expiresIn: '24h' }
        );

        // Kullanıcı girişini logla
        if (UserLog) {
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];
            await UserLog.create({
                userId: user.id,
                action: 'LOGIN',
                ipAddress: ipAddress,
                userAgent: userAgent
            });
        }

        // Başarılı yanıt (Şifreyi gönderme)
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });

    } catch (error) {
        console.error("Login Hatası:", error); // Hatayı konsola yazdır
        res.status(500).json({ message: error.message || 'Sunucu hatası' });
    }
};

exports.logout = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli');
                const UserLog = sequelize.models.UserLog;
                
                if (UserLog) {
                    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                    const userAgent = req.headers['user-agent'];
                    await UserLog.create({
                        userId: decoded.id,
                        action: 'LOGOUT',
                        ipAddress: ipAddress,
                        userAgent: userAgent
                    });
                }
            } catch (err) {
                console.warn("Logout: Geçersiz veya süresi dolmuş token ile çıkış denemesi.");
            }
        }
        
        res.json({ message: 'Çıkış işlemi kaydedildi.' });
    } catch (error) {
        console.error("Logout Hatası:", error);
        res.status(500).json({ message: error.message || 'Sunucu hatası' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Yetkilendirme tokeni bulunamadı.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli');
        const userId = decoded.id;

        const User = sequelize.models.User;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mevcut şifre hatalı.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword });

        res.json({ message: 'Şifre başarıyla güncellendi.' });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Geçersiz token.' });
        }
        console.error("Şifre Değiştirme Hatası:", error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { phone } = req.body;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Yetkilendirme tokeni bulunamadı.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli');
        const userId = decoded.id;

        const User = sequelize.models.User;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        const updateData = { phone };

        if (req.file) {
            updateData.avatar = `/uploads/${req.file.filename}`;
        }

        await user.update(updateData);
        
        const updatedUser = user.toJSON();
        delete updatedUser.password;

        res.json({ message: 'Profil başarıyla güncellendi.', user: updatedUser });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Geçersiz token.' });
        }
        console.error("Profil Güncelleme Hatası:", error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};
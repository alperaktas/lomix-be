import nodemailer from 'nodemailer';

// SMTP Ayarları .env dosyasından
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Lomix App" <lomixmedya@gmail.com>',
            to,
            subject,
            html,
        });
        console.log("Email sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Email error:", error);
        return false;
    }
};

// Basit HTML Şablon Oluşturucu
export const getEmailTemplate = (type: 'verification' | 'reset-password' | 'welcome', data: any) => {
    const logoUrl = process.env.APP_URL ? `${process.env.APP_URL}/img/logo.png` : 'https://placehold.co/200x60?text=Lomix';

    let content = '';

    if (type === 'verification') {
        content = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${logoUrl}" alt="Lomix Logo" style="max-height: 50px;">
                </div>
                <h2 style="color: #333; text-align: center;">Hoş Geldiniz, ${data.username}!</h2>
                <p>Üyeliğinizi tamamlamak için lütfen aşağıdaki doğrulama kodunu uygulamaya giriniz:</p>
                <div style="background-color: #f4f6fa; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #206bc4; margin: 20px 0;">
                    ${data.verificationCode}
                </div>
                <p style="color: #666; font-size: 14px;">Bu kodu siz talep etmediyseniz, lütfen dikkate almayınız.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="text-align: center; color: #999; font-size: 12px;">© ${new Date().getFullYear()} Lomix Medya</p>
            </div>
        `;
    } else if (type === 'reset-password') {
        content = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${logoUrl}" alt="Lomix Logo" style="max-height: 50px;">
                </div>
                <h2 style="color: #333; text-align: center;">Şifre Sıfırlama Talebi</h2>
                <p>Hesabınız için şifre sıfırlama talebi aldık. Kodunuz aşağıdadır:</p>
                <div style="background-color: #fff1f0; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #d63939; margin: 20px 0;">
                    ${data.resetCode}
                </div>
                <p style="color: #666; font-size: 14px;">Bu kod 1 saat süreyle geçerlidir.</p>
                <p style="color: #666; font-size: 14px;">Talebi siz yapmadıysanız güvenliğiniz için şifrenizi değiştirmeyin.</p>
            </div>
        `;
    } else if (type === 'welcome') {
        content = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${logoUrl}" alt="Lomix Logo" style="max-height: 50px;">
                </div>
                <h2 style="color: #333; text-align: center;">Aramıza Hoş Geldiniz!</h2>
                <p>Merhaba <strong>${data.username}</strong>, hesabınız başarıyla doğrulandı.</p>
                <p>Lomix dünyasına adım attığınız için mutluyuz. Artık tüm özelliklere erişebilir ve deneyiminize başlayabilirsiniz.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL || '#'}" style="background-color: #206bc4; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Uygulamaya Git</a>
                </div>
                <p style="color: #666; font-size: 14px;">Herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="text-align: center; color: #999; font-size: 12px;">© ${new Date().getFullYear()} Lomix Medya</p>
            </div>
        `;
    }

    return content;
};

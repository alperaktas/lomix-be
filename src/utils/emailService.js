const nodemailer = require('nodemailer');

// Transporter oluşturma (SMTP ayarları .env dosyasından gelir)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // 465 portu için true, diğerleri için false
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendEmail = async (to, subject, text, html) => {
    try {
        // Email gönderme işlemi
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Lomix Destek" <no-reply@lomix.com>',
            to: to,
            subject: subject,
            text: text, // HTML desteklemeyen istemciler için düz metin
            html: html  // HTML içeriği
        });

        console.log("✅ Email gönderildi: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Email gönderme hatası:", error);
        // Hata durumunda akışı bozmamak için null dönebiliriz veya hatayı fırlatabiliriz.
        // Şimdilik sadece logluyoruz.
    }
};
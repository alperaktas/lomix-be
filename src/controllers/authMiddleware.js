const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Header'dan token'ı al: "Bearer <token>"
        const token = req.headers.authorization.split(' ')[1];

        // Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar');

        // Çözülen veriyi request nesnesine ekle
        req.userData = decoded;

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Oturum geçersiz veya süresi dolmuş.' });
    }
};
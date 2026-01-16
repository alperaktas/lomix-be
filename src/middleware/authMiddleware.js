const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Header formatı: "Bearer <token>"
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistirilmeli');
        req.userData = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Yetkilendirme başarısız. Lütfen giriş yapın.'
        });
    }
};
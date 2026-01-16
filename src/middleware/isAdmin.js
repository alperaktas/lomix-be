module.exports = (req, res, next) => {
    // authMiddleware req.userData'yı doldurur
    // Token payload: { id, role, email }
    if (req.userData && req.userData.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Erişim reddedildi. Bu işlem için admin yetkisi gereklidir.' });
    }
};
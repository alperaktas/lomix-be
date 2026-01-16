/**
 * Belirtilen rollere sahip kullanıcıların erişimine izin verir.
 * Örnek Kullanım: router.get('/admin-panel', authMiddleware, roleMiddleware(['admin']), controller.action);
 */
module.exports = (roles = []) => {
    // Tek bir rol string olarak gelirse diziye çevir
    if (typeof roles === 'string') roles = [roles];

    return (req, res, next) => {
        if (roles.length && !roles.includes(req.userData.role)) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
        }
        next();
    };
};
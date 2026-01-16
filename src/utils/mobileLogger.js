const logger = require('../utils/logger');

module.exports = (req, res, next) => {
    // Sadece /api/mobile ile başlayan istekleri logla
    if (req.originalUrl && req.originalUrl.startsWith('/api/mobile')) {
        const start = Date.now();

        // Yanıt tamamlandığında log kaydı oluştur
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.info('Mobile API Operation', {
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                ip: req.ip,
                duration: `${duration}ms`,
                userAgent: req.get('user-agent')
            });
        });
    }
    next();
};
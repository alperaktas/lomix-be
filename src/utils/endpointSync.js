const sequelize = require('../config/db');

// Express regex yollarını string'e çeviren yardımcı fonksiyon
function getPathFromRegexp(regexp) {
    if (!regexp || regexp.fast_slash) return '';
    const str = regexp.toString();
    // Regex temizleme (Express 4.x formatı için)
    let clean = str
        .replace(/^\/\^/, '') // Başlangıç işaretini kaldır
        .replace(/\/i$/, '') // Flagleri kaldır
        .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '') // Bitiş eşleşmesini kaldır
        .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':param') // Parametreleri basitleştir
        .replace(/\\(.)/g, '$1'); // Kaçış karakterlerini temizle

    if (clean === '') return '';
    return clean;
}

// Uygulamadaki tüm rotaları özyinelemeli (recursive) olarak bulan fonksiyon
function getEndpoints(app) {
    const endpoints = [];

    function processStack(stack, prefix = '') {
        if (!stack) return;

        stack.forEach(layer => {
            if (layer.route) {
                // Bu bir rota (örn: app.get('/path'))
                const path = prefix + layer.route.path;
                const methods = Object.keys(layer.route.methods).filter(m => layer.route.methods[m]);

                methods.forEach(method => {
                    // Kategoriyi URL'den tahmin et (örn: /api/users -> users)
                    const parts = path.split('/').filter(p => p.length > 0);
                    const category = parts.length > 1 ? parts[1] : (parts[0] || 'general');

                    endpoints.push({
                        method: method.toUpperCase(),
                        path: path,
                        category: category
                    });
                });
            } else if (layer.name === 'router' && layer.handle.stack) {
                // Bu bir Router (örn: app.use('/api', router))
                const pathPart = getPathFromRegexp(layer.regexp);
                processStack(layer.handle.stack, prefix + pathPart);
            }
        });
    }

    if (app._router && app._router.stack) {
        processStack(app._router.stack);
    }
    return endpoints;
}

const syncEndpoints = async (app) => {
    try {
        const Endpoint = sequelize.models.Endpoint;
        if (!Endpoint) return;

        const detectedEndpoints = getEndpoints(app);
        console.log(`🔍 ${detectedEndpoints.length} API uç noktası tespit edildi.`);

        for (const ep of detectedEndpoints) {
            // Veritabanında var mı kontrol et
            const exists = await Endpoint.findOne({ where: { method: ep.method, path: ep.path } });

            if (!exists) {
                await Endpoint.create({ ...ep, description: 'Otomatik tespit edildi' });
            }
        }
        console.log('✅ API uç noktaları veritabanı ile senkronize edildi.');
    } catch (error) {
        console.error('❌ Endpoint senkronizasyon hatası:', error);
    }
};

module.exports = syncEndpoints;
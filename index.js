require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Dinamik route yönetimi için router değişkeni
let dynamicRouter = express.Router();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => dynamicRouter(req, res, next));

// Dosya yolları
const MAP_FILE = path.join(__dirname, 'endpoints_map.json');
const JSON_DIR = path.join(__dirname, 'endpoint_jsons');

// endpoint_jsons klasörü yoksa oluştur
if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR);
}

// Endpoint haritasını yükle ve route'ları oluştur
function loadRoutes() {
    console.log('Route yapılandırması yükleniyor...');
    if (!fs.existsSync(MAP_FILE)) {
        console.warn('UYARI: endpoints_map.json dosyası bulunamadı.');
        return;
    }

    try {
        const mapData = fs.readFileSync(MAP_FILE, 'utf8');
        const endpoints = JSON.parse(mapData);
        const newRouter = express.Router();

        if (Array.isArray(endpoints)) {
            endpoints.forEach(endpoint => {
                const { uri, method, response_file } = endpoint;

                // Gerekli alanların kontrolü (Sunucunun çökmesini engeller)
                if (!uri || !method || !response_file) {
                    console.warn('UYARI: Eksik parametreli endpoint atlandı:', endpoint);
                    return;
                }

                const httpMethod = method.toLowerCase();

                if (newRouter[httpMethod]) {
                    newRouter[httpMethod](uri, (req, res) => {
                        console.log(`\n--- İSTEK: ${method.toUpperCase()} ${uri} ---`);
                        console.log('Headers:', JSON.stringify(req.headers, null, 2));
                        if (req.body && Object.keys(req.body).length > 0) {
                            console.log('Body:', JSON.stringify(req.body, null, 2));
                        }

                        const filePath = path.join(JSON_DIR, response_file);

                        fs.readFile(filePath, 'utf8', (err, data) => {
                            if (err) {
                                console.error(`Dosya okuma hatası: ${filePath}`, err);
                                return res.status(404).json({ error: 'Response file not found' });
                            }
                            try {
                                const jsonData = JSON.parse(data);
                                console.log(`--- CEVAP: ${response_file} ---`);
                                console.log(JSON.stringify(jsonData, null, 2));
                                res.json(jsonData);
                            } catch (parseErr) {
                                res.status(500).json({ error: 'Invalid JSON format in file' });
                            }
                        });
                    });
                    console.log(`Route tanımlandı: [${method.toUpperCase()}] ${uri} -> ${response_file}`);
                }
            });
        }

        dynamicRouter = newRouter;
        console.log('Route haritası güncellendi.');
    } catch (err) {
        console.error('endpoints_map.json işlenirken hata oluştu:', err);
    }
}

loadRoutes();

// Dosya değişikliklerini izle
fs.watch(MAP_FILE, (eventType, filename) => {
    if (eventType === 'change') {
        console.log('endpoints_map.json değişti, route\'lar yenileniyor...');
        setTimeout(loadRoutes, 100); // Dosya yazma işleminin tamamlanması için kısa bekleme
    }
});

// 404 Handler - Eşleşmeyen route'ları yakala ve logla
app.use((req, res, next) => {
    console.log(`UYARI: 404 Route Bulunamadı -> ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Endpoint not found', path: req.url, method: req.method });
});

// Global hata yakalayıcı (Beklenmeyen hatalarda sunucuyu ayakta tutar)
app.use((err, req, res, next) => {
    console.error('Sunucu Hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası oluştu', details: err.message });
});

if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    try {
        const httpsOptions = {
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH)
        };
        https.createServer(httpsOptions, app).listen(PORT, () => {
            console.log(`🚀 HTTPS Sunucu ${PORT} portunda çalışıyor (SSL Aktif).`);
        });
    } catch (error) {
        console.error("SSL Başlatma Hatası:", error.message);
        app.listen(PORT, () => console.log(`🚀 HTTP Sunucu ${PORT} portunda çalışıyor (SSL Hatası).`));
    }
} else {
    app.listen(PORT, () => {
        console.log(`🚀 HTTP Sunucu ${PORT} portunda çalışıyor.`);
    });
}
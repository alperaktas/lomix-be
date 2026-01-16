require('dotenv').config();
const express = require('express');
const https = require('https');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const { DataTypes } = require('sequelize');
const sequelize = require('./src/config/db');
const routes = require('./src/routes');
const menuRoutes = require('./src/routes/menuRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const endpointRoutes = require('./src/routes/endpointRoutes');
const systemRoutes = require('./src/routes/systemRoutes');
const mobileRoutes = require('./src/routes/mobileRoutes');
const mobileLogger = require('./src/utils/mobileLogger');
const seedData = require('./src/utils/seeder');
const syncEndpoints = require('./src/utils/endpointSync');
const authMiddleware = require('./src/middleware/authMiddleware');

const app = express();
app.enable('trust proxy'); // Reverse proxy (Nginx/Cloudflare) arkasında IP ve protokolü doğru almak için
app.use(cors({
    origin: ['https://admin.lomixlive.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dinamik route yönetimi için router değişkeni
let dynamicRouter = express.Router();
app.use((req, res, next) => dynamicRouter(req, res, next));

// --- LOGLAMA (Morgan & Rotating File Stream) ---
const logDirectory = path.join(__dirname, 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// Günlük log dosyası oluştur (access.log)
const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // 1 gün arayla yeni dosya oluştur
    path: logDirectory
});
app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.static('public'));
// Uploads klasörünü oluştur (yoksa)
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));
app.use('/libs/tabler', express.static(path.join(__dirname, 'node_modules/@tabler/core/dist')));
app.use('/libs/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

// --- MODELS ---
const Role = require('./src/models/Roles')(sequelize, DataTypes);
const User = require('./src/models/User')(sequelize, DataTypes);
const Group = require('./src/models/Group')(sequelize, DataTypes);
const UserGroup = require('./src/models/UserGroup')(sequelize, DataTypes);
const UserLog = require('./src/models/UserLog')(sequelize, DataTypes);
const Log = require('./src/models/Log')(sequelize, DataTypes);
const Endpoint = require('./src/models/Endpoint')(sequelize, DataTypes);

// --- ASSOCIATIONS (İLİŞKİLER) ---
User.belongsToMany(Group, { through: UserGroup, foreignKey: 'userId', otherKey: 'groupId', as: 'groups' });
Group.belongsToMany(User, { through: UserGroup, foreignKey: 'groupId', otherKey: 'userId', as: 'users' });
User.hasMany(UserLog, { foreignKey: 'userId', as: 'logs' });
UserLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- ROUTES ---
app.use('/api/menus', authMiddleware, menuRoutes);
app.use('/api/roles', authMiddleware, roleRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api', authRoutes); // /api/login rotasını aktif eder
app.use('/api/groups', authMiddleware, groupRoutes);
app.use('/api/endpoints', authMiddleware, endpointRoutes);
app.use('/api/system', systemRoutes);
app.use(mobileLogger); // Mobil loglama middleware'ini aktif et
app.use('/api/mobile', mobileRoutes); // Mobil API'ler: /api/mobile/auth/register
app.use('/api', routes);

// --- FRONTEND ROUTE ---
// '*' yerine /(.*)/ yazıyoruz (Tırnak yok, slash var)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- BAŞLATMA ve SEED DATA (İlk çalışmada veri ekler) ---
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(async () => {
    // Eski/kullanılmayan tabloyu temizle
    await sequelize.query('DROP TABLE IF EXISTS "admin_menus" CASCADE;').catch(() => { });

    await seedRoles();
    await seedData();
    await syncEndpoints(app); // API uç noktalarını veritabanına kaydet
    await Endpoint.syncSocialEndpoints(); // Sosyal medya endpointlerini kaydet

    // SSL Sertifikaları varsa HTTPS sunucusunu başlat (Port 3000)
    if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
        try {
            const httpsOptions = {
                key: fs.readFileSync(process.env.SSL_KEY_PATH),
                cert: fs.readFileSync(process.env.SSL_CERT_PATH)
            };
            https.createServer(httpsOptions, app).listen(PORT, () => {
                console.log(`🚀 HTTPS Server çalışıyor: https://admin.lomixlive.com:${PORT}`);
            });
        } catch (error) {
            console.error("❌ SSL Başlatma Hatası:", error.message);
            app.listen(PORT, () => console.log(`🚀 HTTP Server çalışıyor (SSL Hatası): http://localhost:${PORT}`));
        }
    } else {
        app.listen(PORT, () => console.log(`🚀 HTTP Server çalışıyor: http://localhost:${PORT}`));
    }
}).catch((err) => {
    console.error("❌ Veritabanı bağlantı hatası:", err);
});

async function seedRoles() {
    try {
        const count = await Role.count();
        if (count === 0) {
            console.log("Roller tablosu boş, varsayılanlar ekleniyor...");
            await Role.bulkCreate([{ name: 'admin' }, { name: 'normal' }, { name: 'müşteri' }]);
            console.log("✅ Varsayılan roller (admin, normal, müşteri) eklendi.");
        }
    } catch (error) {
        console.error("Roller eklenirken hata:", error);
    }
}

// --- DİNAMİK ENDPOINT YÖNETİMİ ---
const MAP_FILE = path.join(__dirname, 'endpoints_map.json');
const JSON_DIR = path.join(__dirname, 'endpoint_jsons');

// endpoint_jsons klasörü yoksa oluştur
if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR);
}

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

                // Gerekli alanların kontrolü
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
                                // console.log(JSON.stringify(jsonData, null, 2));
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
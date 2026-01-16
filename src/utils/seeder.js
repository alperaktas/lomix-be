const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

async function seedUsers() {
    const User = sequelize.models.User;
    if (!User) {
        console.error("❌ Seeder Hatası: User modeli bulunamadı.");
        return;
    }

    // Admin kullanıcısının durumunu her başlangıçta kontrol et ve aktif yap
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (adminUser && adminUser.status !== 'active') {
        await adminUser.update({ status: 'active' });
        console.log("✅ Admin kullanıcısı durumu 'active' olarak güncellendi.");
    }

    const count = await User.count();
    if (count === 0) {
        console.log("🌱 Kullanıcı tablosu boş, varsayılan admin ekleniyor...");
        const hashedPassword = await bcrypt.hash('123', 10);
        await User.create({
            username: 'admin',
            email: 'admin@lomix.com',
            password: hashedPassword,
            role: 'admin',
            status: 'active'
        });
        console.log("✅ Varsayılan admin kullanıcısı eklendi: admin@lomix.com / 123");
    }
}

async function seedMenus() {
    const [tables] = await sequelize.query("SELECT to_regclass('public.menus')");
    if (!tables[0].to_regclass) return;

    const [parents] = await sequelize.query("SELECT id FROM menus WHERE title = 'Kullanıcı İşlemleri' LIMIT 1");
    const parentId = parents.length > 0 ? parents[0].id : null;

    // Eski 'Sistem Durumu' menüsünü temizle
    await sequelize.query("DELETE FROM menus WHERE url = '/queue-dashboard'");

    // Dashboard Menüsü
    const [existingDashboard] = await sequelize.query("SELECT id FROM menus WHERE url = '/dashboard'");
    if (existingDashboard.length === 0) {
        await sequelize.query(
            `INSERT INTO menus (title, url, icon, parent_id, "order", "createdAt", "updatedAt") 
             VALUES ('Dashboard', '/dashboard', 'ti-dashboard', null, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        );
        console.log("✅ 'Dashboard' menüsü eklendi.");
    }

    const [existingGroupMenu] = await sequelize.query("SELECT id FROM menus WHERE url = '/users/group'");
    if (existingGroupMenu.length === 0) {
        await sequelize.query(
            `INSERT INTO menus (title, url, icon, parent_id, "order", "createdAt", "updatedAt") 
             VALUES ('Gruplar', '/users/group', 'fa-layer-group', :parentId, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            { replacements: { parentId: parentId } }
        );
        console.log("✅ 'Gruplar' menüsü eklendi.");
    }

    const [existingLogMenu] = await sequelize.query("SELECT id FROM menus WHERE url = '/users/logs'");
    if (existingLogMenu.length === 0) {
        await sequelize.query(
            `INSERT INTO menus (title, url, icon, parent_id, "order", "createdAt", "updatedAt") 
             VALUES ('Loglar', '/users/logs', 'fa-history', :parentId, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            { replacements: { parentId: parentId } }
        );
        console.log("✅ 'Loglar' menüsü eklendi.");
    }

    const [settingsMenu] = await sequelize.query("SELECT id FROM menus WHERE title = 'Ayarlar' LIMIT 1");
    if (settingsMenu.length > 0) {
        const settingsParentId = settingsMenu[0].id;
        const [existingApiMenu] = await sequelize.query("SELECT id FROM menus WHERE url = '/settings/apis'");
        if (existingApiMenu.length === 0) {
            await sequelize.query(
                `INSERT INTO menus (title, url, icon, parent_id, "order", "createdAt", "updatedAt") 
                 VALUES ('API Endpointleri', '/settings/apis', 'fa-code', :settingsParentId, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                { replacements: { settingsParentId: settingsParentId } }
            );
            console.log("✅ 'API Endpointleri' menüsü eklendi.");
        }

        // Eski URL yapısını düzelt (Varsa)
        await sequelize.query("UPDATE menus SET url = '/queue-dashboard' WHERE url = '/queue-dashboard.html'");
    }
}

async function seedGroups() {
    const Group = sequelize.models.Group;
    if (!Group) return;

    const groupCount = await Group.count();
    if (groupCount === 0) {
        console.log("🌱 Gruplar tablosu boş, varsayılan gruplar ekleniyor...");
        await Group.bulkCreate([
            { name: 'Yazılım Ekibi', description: 'Yazılım geliştirme departmanı' },
            { name: 'Satış Ekibi', description: 'Satış ve pazarlama departmanı' },
            { name: 'Yönetim', description: 'Şirket yönetimi' }
        ]);
        console.log("✅ Varsayılan gruplar eklendi.");
    }
}

async function seedEndpoints() {
    const Endpoint = sequelize.models.Endpoint;
    if (!Endpoint) return;

    const endpoints = [
        // Auth
        { category: 'Auth', method: 'POST', path: '/api/login', description: 'Kullanıcı girişi yapar ve token döner.', requestSample: '{"email": "admin@lomix.com", "password": "123"}', responseSample: '{"token": "...", "user": {...}}' },
        { category: 'Auth', method: 'POST', path: '/api/logout', description: 'Kullanıcı çıkışı yapar ve log kaydı atar.', requestSample: '{}', responseSample: '{"message": "Çıkış işlemi kaydedildi."}' },

        // Users
        { category: 'Users', method: 'GET', path: '/api/users', description: 'Tüm kullanıcıları listeler (Sayfalama ve arama destekler).', requestSample: '{}', responseSample: '[{"id": 1, "username": "admin", ...}]' },
        { category: 'Users', method: 'POST', path: '/api/users', description: 'Yeni kullanıcı oluşturur.', requestSample: '{"username": "test", "email": "test@test.com", "password": "123", "role": "user"}', responseSample: '{"id": 2, ...}' },
        { category: 'Users', method: 'PUT', path: '/api/users/:id', description: 'Kullanıcı bilgilerini günceller.', requestSample: '{"username": "newname"}', responseSample: '{"message": "Kullanıcı güncellendi"}' },
        { category: 'Users', method: 'DELETE', path: '/api/users/:id', description: 'Kullanıcıyı siler.', requestSample: '{}', responseSample: '{"message": "Kullanıcı silindi"}' },
        { category: 'Users', method: 'GET', path: '/api/users/stats', description: 'Kullanıcı istatistiklerini döner.', requestSample: '{}', responseSample: '{"totalUsers": 10, "roles": [...], "groups": [...]}' },
        { category: 'Users', method: 'GET', path: '/api/users/logs', description: 'Kullanıcı loglarını listeler.', requestSample: '{}', responseSample: '{"totalItems": 50, "logs": [...]}' },

        // Roles
        { category: 'Roles', method: 'GET', path: '/api/roles', description: 'Tüm rolleri listeler.', requestSample: '{}', responseSample: '[{"id": 1, "name": "admin", ...}]' },
        { category: 'Roles', method: 'POST', path: '/api/roles', description: 'Yeni rol oluşturur.', requestSample: '{"name": "editor"}', responseSample: '{"id": 3, "name": "editor"}' },
        { category: 'Roles', method: 'DELETE', path: '/api/roles/:id', description: 'Rolü siler (Kullanıcısı yoksa).', requestSample: '{}', responseSample: '{"message": "Rol silindi"}' },

        // Groups
        { category: 'Groups', method: 'GET', path: '/api/groups', description: 'Tüm grupları listeler.', requestSample: '{}', responseSample: '[{"id": 1, "name": "Yazılım Ekibi", ...}]' },
        { category: 'Groups', method: 'POST', path: '/api/groups', description: 'Yeni grup oluşturur.', requestSample: '{"name": "İK", "description": "İnsan Kaynakları"}' },
        { category: 'Groups', method: 'GET', path: '/api/groups/:id/members', description: 'Gruba ait üyeleri listeler.', requestSample: '{}', responseSample: '[{"id": 1, "username": "admin", ...}]' },

        // Mobile
        { category: 'Mobile', method: 'POST', path: '/api/mobile/auth/register', description: 'Mobil uygulamadan yeni kullanıcı kaydı oluşturur.', requestSample: '{"username": "mobiluser", "email": "mobil@test.com", "password": "123", "gender": "male", "deviceModel": "iPhone 13", "phone": "5551234567"}', responseSample: '{"message": "Kayıt başarılı...", "userId": 5, "status": "pending"}' },
        { category: 'Mobile', method: 'POST', path: '/api/mobile/auth/login', description: 'Mobil uygulama girişi yapar ve token döner.', requestSample: '{"email": "mobil@test.com", "password": "123", "deviceInfo": "iPhone 13"}', responseSample: '{"message": "Giriş başarılı.", "token": "...", "user": {"id": 1, "username": "mobiluser", "email": "mobil@test.com", "role": "user", "avatar": null}}' },
        { category: 'Mobile', method: 'POST', path: '/api/mobile/auth/logout', description: 'Mobil uygulamadan çıkış yapar (Log kaydı oluşturur).', requestSample: '{"deviceInfo": "iPhone 13"}', responseSample: '{"message": "Başarıyla çıkış yapıldı."}' },
        { category: 'Mobile', method: 'POST', path: '/api/mobile/auth/verify', description: 'Kullanıcı doğrulama kodunu kontrol eder ve hesabı aktif eder.', requestSample: '{"email": "mobil@test.com", "code": "1234"}', responseSample: '{"message": "Hesap başarıyla doğrulandı ve aktif edildi."}' },
        { category: 'Mobile', method: 'POST', path: '/api/mobile/auth/forgot-password', description: 'Şifre sıfırlama kodu gönderir.', requestSample: '{"email": "mobil@test.com"}', responseSample: '{"message": "Şifre sıfırlama kodu e-posta adresinize gönderildi."}' },
        { category: 'Mobile', method: 'POST', path: '/api/mobile/auth/reset-password', description: 'Şifreyi sıfırlar.', requestSample: '{"email": "mobil@test.com", "code": "1234", "newPassword": "newPass123"}' },

        // Menus
        { category: 'Menus', method: 'GET', path: '/api/menus', description: 'Menü ağacını döner.', requestSample: '{}', responseSample: '[{"id": 1, "title": "Dashboard", "children": []}]' }
    ];

    for (const ep of endpoints) {
        const existing = await Endpoint.findOne({ where: { method: ep.method, path: ep.path } });
        if (!existing) {
            await Endpoint.create(ep);
        }
    }
}

module.exports = async () => {
    try {
        await seedUsers();
        await seedMenus();
        await seedGroups();
        await seedEndpoints();
    } catch (error) {
        console.error("❌ Seed Data Hatası:", error);
    }
};
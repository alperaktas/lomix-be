const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://lomix:lomix_pass@localhost:5432/lomix'
    });

    try {
        await client.connect();
        console.log('✅ Bağlantı başarılı!');

        // Tabloları listele
        const tables = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        console.log('\n📋 Tablolar:');
        tables.rows.forEach(r => console.log('   -', r.table_name));

        // Kullanıcı sayısı
        const userCount = await client.query('SELECT COUNT(*) FROM "User"');
        console.log('\n👤 Kullanıcı sayısı:', userCount.rows[0].count);

        // Oda sayısı
        try {
            const roomCount = await client.query('SELECT COUNT(*) FROM "Room"');
            console.log('🚪 Oda sayısı:', roomCount.rows[0].count);
        } catch (e) {
            console.log('🚪 Room tablosu yok');
        }

        // Son birkaç kullanıcı
        const users = await client.query('SELECT id, username, email, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 5');
        console.log('\n👤 Son 5 kullanıcı:');
        users.rows.forEach(u => console.log(`   [${u.id}] ${u.username} - ${u.email} (${u.createdAt})`));

        await client.end();
    } catch (err) {
        console.log('❌ Hata:', err.message);
    }
}

main();

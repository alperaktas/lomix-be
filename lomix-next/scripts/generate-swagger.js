/**
 * Swagger/OpenAPI spec oluşturma scripti
 *
 * route.ts dosyalarındaki @swagger JSDoc annotasyonlarını okur
 * ve public/swagger.json dosyasını oluşturur.
 *
 * Kullanım: node scripts/generate-swagger.js
 */

const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const SWAGGER_JSON_PATH = path.join(__dirname, '..', 'public', 'swagger.json');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Lomix Mobile API Documentation',
            version: '1.0.0',
            description: 'API documentation for Lomix Mobile Application',
        },
        servers: [
            {
                url: 'https://lomix-be-i2rg.vercel.app',
                description: 'Production server',
            },
            {
                url: 'http://localhost:3000',
                description: 'Local server (Development)',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/app/api/**/*.ts', './src/app/api/**/*.js'],
};

try {
    console.log('🔄 Swagger spec oluşturuluyor...');

    // swagger-jsdoc ile route dosyalarındaki @swagger annotasyonlarını parse et
    const swaggerSpec = swaggerJsdoc(options);

    // Eğer hiç path bulunamadıysa, mevcut swagger.json'ı koru
    const pathCount = Object.keys(swaggerSpec.paths || {}).length;

    if (pathCount === 0 && fs.existsSync(SWAGGER_JSON_PATH)) {
        console.log('⚠️  Hiçbir API endpoint bulunamadı. Mevcut swagger.json korunuyor.');
        process.exit(0);
    }

    // JSON dosyasına yaz
    fs.writeFileSync(SWAGGER_JSON_PATH, JSON.stringify(swaggerSpec, null, 2), 'utf-8');
    console.log(`✅ Swagger spec başarıyla oluşturuldu: ${SWAGGER_JSON_PATH}`);
    console.log(`📦 Toplam ${pathCount} endpoint bulundu.`);
} catch (error) {
    console.error('❌ Swagger spec oluşturulurken hata:', error.message);

    // Hata durumunda mevcut dosyayı koru
    if (fs.existsSync(SWAGGER_JSON_PATH)) {
        console.log('⚠️  Mevcut swagger.json dosyası korunuyor.');
    } else {
        // Hiç yoksa minimal bir başlangıç dosyası oluştur
        const fallback = {
            openapi: '3.0.0',
            info: {
                title: 'Lomix Mobile API Documentation',
                version: '1.0.0',
                description: 'API documentation for Lomix Mobile Application',
            },
            servers: [
                { url: 'https://lomix-be-i2rg.vercel.app', description: 'Production server' },
                { url: 'http://localhost:3000', description: 'Local server (Development)' },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                },
            },
            paths: {},
        };
        fs.writeFileSync(SWAGGER_JSON_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
        console.log('📄 Minimal swagger.json oluşturuldu.');
    }

    process.exit(1);
}

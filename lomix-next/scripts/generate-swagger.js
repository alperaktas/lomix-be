const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

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
                url: 'http://localhost:3000',
                description: 'Local server (Development)',
            },
            {
                url: process.env.NEXT_PUBLIC_API_URL || 'https://lomix.vercel.app',
                description: 'Production server',
            }
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
    // We run this from the project root, so the path is relative to the project root
    apis: [path.join(__dirname, '../src/app/api/mobile/**/*.ts')],
};

// Generate the doc
const spec = swaggerJsdoc(options);

// Output the spec to the public folder where Next router can serve it
const outputPath = path.join(__dirname, '../public/swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

console.log(`Swagger documentation generated successfully at ${outputPath}`);

module.exports = (sequelize, DataTypes) => {
    const Endpoint = sequelize.define("Endpoint", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        method: {
            type: DataTypes.STRING(10), // GET, POST, etc.
            allowNull: false
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        requestSample: {
            type: DataTypes.TEXT, // JSON string olarak saklanacak
            field: 'request_sample'
        },
        responseSample: {
            type: DataTypes.TEXT, // JSON string olarak saklanacak
            field: 'response_sample'
        }
    }, {
        tableName: 'api_endpoints',
        timestamps: true,
        underscored: true
    });

    // Sosyal Medya Endpointlerini veritabanına senkronize etmek için yardımcı metod
    Endpoint.syncSocialEndpoints = async () => {
        // Eski/Hatalı path ile kaydedilmiş olanları temizle
        await Endpoint.destroy({
            where: {
                path: ['/auth/google', '/auth/facebook', '/auth/apple'],
                category: 'Mobile Auth'
            }
        });

        const socialEndpoints = [
            {
                category: 'Mobile Auth',
                method: 'POST',
                path: '/api/mobile/auth/google',
                description: 'Google hesabı ile mobil giriş ve kayıt işlemi.',
                requestSample: JSON.stringify({
                    token: "google_id_token_string",
                    deviceInfo: "iPhone 13 Pro"
                }),
                responseSample: JSON.stringify({
                    message: "Google ile giriş başarılı.",
                    token: "jwt_access_token",
                    user: { id: 1, username: "John Doe", email: "john@gmail.com", role: "user", avatar: "url" }
                })
            },
            {
                category: 'Mobile Auth',
                method: 'POST',
                path: '/api/mobile/auth/facebook',
                description: 'Facebook hesabı ile mobil giriş ve kayıt işlemi.',
                requestSample: JSON.stringify({
                    token: "facebook_access_token_string",
                    deviceInfo: "Samsung S21"
                }),
                responseSample: JSON.stringify({
                    message: "Facebook ile giriş başarılı.",
                    token: "jwt_access_token",
                    user: { id: 1, username: "John Doe", email: "john@facebook.com", role: "user", avatar: "url" }
                })
            },
            {
                category: 'Mobile Auth',
                method: 'POST',
                path: '/api/mobile/auth/apple',
                description: 'Apple ID ile mobil giriş ve kayıt işlemi.',
                requestSample: JSON.stringify({
                    token: "apple_identity_token_string",
                    deviceInfo: "iPad Air"
                }),
                responseSample: JSON.stringify({
                    message: "Apple ile giriş başarılı.",
                    token: "jwt_access_token",
                    user: { id: 1, username: "John Doe", email: "john@icloud.com", role: "user", avatar: "url" }
                })
            }
        ];

        for (const endpoint of socialEndpoints) {
            await Endpoint.findOrCreate({
                where: { path: endpoint.path, method: endpoint.method },
                defaults: endpoint
            });
        }
    };

    return Endpoint;
};
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';

interface EndpointAttributes {
    id: number;
    category: string;
    method: string;
    path: string;
    description?: string | null;
    requestSample?: string | null;
    responseSample?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface EndpointCreationAttributes extends Optional<EndpointAttributes, 'id'> { }

class Endpoint extends Model<EndpointAttributes, EndpointCreationAttributes> implements EndpointAttributes {
    public id!: number;
    public category!: string;
    public method!: string;
    public path!: string;
    public description!: string | null;
    public requestSample!: string | null;
    public responseSample!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Static metod: Sosyal medya endpointlerini senkronize et
    public static async syncSocialEndpoints() {
        // Bu metod, veritabanına otomatik olarak sosyal medya API tanımlarını ekler.
        // Next.js'de server başladığında veya bir trigger ile çağrılabilir.

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
    }
}

Endpoint.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    method: {
        type: DataTypes.STRING(10), // GET, POST vs.
        allowNull: false
    },
    path: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    requestSample: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'request_sample'
    },
    responseSample: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'response_sample'
    }
}, {
    sequelize,
    tableName: 'api_endpoints',
    timestamps: true,
    underscored: true
});

export default Endpoint;

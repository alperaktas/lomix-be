import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';

interface SocialAuthLogAttributes {
    id: number;
    provider: string;
    incomingRequest?: string | null;
    verificationRequest?: string | null;
    providerResponse?: string | null;
    appResponse?: string | null;
    errorMessage?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SocialAuthLogCreationAttributes extends Optional<SocialAuthLogAttributes, 'id'> { }

class SocialAuthLog extends Model<SocialAuthLogAttributes, SocialAuthLogCreationAttributes> implements SocialAuthLogAttributes {
    public id!: number;
    public provider!: string;
    public incomingRequest!: string | null;
    public verificationRequest!: string | null;
    public providerResponse!: string | null;
    public appResponse!: string | null;
    public errorMessage!: string | null;
    public ipAddress!: string | null;
    public userAgent!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SocialAuthLog.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: false
    },
    incomingRequest: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    verificationRequest: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    providerResponse: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    appResponse: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ipAddress: DataTypes.STRING,
    userAgent: DataTypes.STRING
}, {
    sequelize,
    tableName: 'social_auth_logs',
    timestamps: true
});

export default SocialAuthLog;

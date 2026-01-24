import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';

// User Arayüzü
interface UserAttributes {
    id: number;
    username: string;
    email: string;
    password?: string;
    role: string;
    gender?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceModel?: string | null;
    avatar?: string | null;
    phone?: string | null;
    status?: string;
    verificationCode?: string | null;
    resetPasswordCode?: string | null;
    resetPasswordExpires?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public username!: string;
    public email!: string;
    public password!: string;
    public role!: string;
    public gender!: string | null;
    public ipAddress!: string | null;
    public userAgent!: string | null;
    public deviceModel!: string | null;
    public avatar!: string | null;
    public phone!: string | null;
    public status!: string;
    public verificationCode!: string | null;
    public resetPasswordCode!: string | null;
    public resetPasswordExpires!: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'user'
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.STRING,
        field: 'user_agent'
    },
    deviceModel: {
        type: DataTypes.STRING,
        field: 'device_model'
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    },
    verificationCode: {
        type: DataTypes.STRING,
        field: 'verification_code',
        allowNull: true
    },
    resetPasswordCode: {
        type: DataTypes.STRING,
        field: 'reset_password_code',
        allowNull: true
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        field: 'reset_password_expires',
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true
});

export default User;

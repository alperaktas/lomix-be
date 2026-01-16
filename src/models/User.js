module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("User", {
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
            defaultValue: 'pending' // pending: onay bekliyor, active: aktif, suspended: askıya alındı
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
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at'
        }
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true
    });

    return User;
};
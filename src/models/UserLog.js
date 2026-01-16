module.exports = (sequelize, DataTypes) => {
    const UserLog = sequelize.define("UserLog", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        action: {
            type: DataTypes.STRING, // 'LOGIN', 'LOGOUT'
            allowNull: false
        },
        ipAddress: {
            type: DataTypes.STRING,
            field: 'ip_address'
        },
        userAgent: {
            type: DataTypes.STRING,
            field: 'user_agent'
        }
    }, {
        tableName: 'user_logs',
        timestamps: true,
        underscored: true
    });

    return UserLog;
};
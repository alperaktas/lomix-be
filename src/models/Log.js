module.exports = (sequelize, DataTypes) => {
    const Log = sequelize.define("Log", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        level: {
            type: DataTypes.STRING,
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        meta: {
            type: DataTypes.TEXT, // JSON verisi string olarak saklanacak
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'createdAt'
        }
    }, {
        tableName: 'logs',
        timestamps: false // updatedAt sütunu oluşturulmasın, sadece createdAt kullanıyoruz
    });

    return Log;
};
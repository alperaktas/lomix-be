const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SocialAuthLog = sequelize.define('SocialAuthLog', {
    provider: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'google, facebook, apple'
    },
    incomingRequest: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mobil uygulamadan gelen ham istek'
    },
    verificationRequest: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Sosyal medya servisine gönderilen doğrulama isteği'
    },
    providerResponse: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Sosyal medya servisinden dönen cevap'
    },
    appResponse: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mobil uygulamaya dönülen cevap'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ipAddress: DataTypes.STRING,
    userAgent: DataTypes.STRING
}, {
    timestamps: true,
    tableName: 'social_auth_logs'
});

module.exports = SocialAuthLog;
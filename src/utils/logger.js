const winston = require('winston');
require('winston-daily-rotate-file');
require('winston-syslog');
const Transport = require('winston-transport');
const path = require('path');
const sequelize = require('../config/db');

// .env dosyasından loglama tercihlerini alıyoruz
// Örnek: LOG_CHANNELS=file,syslog,database
const logChannels = process.env.LOG_CHANNELS || '';

// Veritabanı için özel Transport
class SequelizeTransport extends Transport {
    constructor(opts) {
        super(opts);
    }

    async log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            const { level, message, ...meta } = info;
            // logs tablosuna kayıt atıyoruz. Tablonun veritabanında var olduğu varsayılır.
            await sequelize.query(
                `INSERT INTO logs (level, message, meta, "createdAt") 
                 VALUES (:level, :message, :meta, CURRENT_TIMESTAMP)`,
                {
                    replacements: {
                        level,
                        message,
                        meta: JSON.stringify(meta)
                    }
                }
            );
        } catch (err) {
            console.error("❌ DB Log Hatası:", err.message);
        }

        callback();
    }
}

const transports = [];

// 1. Dosya Loglama (logs dizini, 24 saatte bir rotasyon, 15 gün saklama)
if (logChannels.includes('file')) {
    transports.push(new winston.transports.DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'mobile-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '15d', // 15 günden eski dosyalar silinir
        level: 'info'
    }));
}

// 2. Syslog Loglama
if (logChannels.includes('syslog')) {
    transports.push(new winston.transports.Syslog({
        protocol: 'udp4',
        app_name: 'lomix-mobile-api',
        eol: '\n'
    }));
}

// 3. Database Loglama
if (logChannels.includes('database')) {
    transports.push(new SequelizeTransport());
}

// Fallback: Hiçbir kanal seçili değilse konsola bas (Geliştirme ortamı için)
if (transports.length === 0) {
    transports.push(new winston.transports.Console());
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: transports
});

module.exports = logger;
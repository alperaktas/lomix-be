import winston from 'winston';
import 'winston-daily-rotate-file';
import Transport from 'winston-transport';
import path from 'path';
import prisma from './prisma';

// Log kanallarını .env'den alıyoruz
const logChannels = (process.env.LOG_CHANNELS || 'console,database').split(',');

const transports: winston.transport[] = [];

// 1. Konsol Loglama
if (logChannels.includes('console')) {
    transports.push(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// 2. Dosya Loglama
if (logChannels.includes('file')) {
    transports.push(new winston.transports.DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info'
    }));
}

// 3. Veritabanı Loglama (Custom Transport)
class PrismaTransport extends Transport {
    constructor(opts?: any) {
        super(opts);
    }

    override log(info: any, callback: () => void) {
        setImmediate(() => this.emit('logged', info));

        // Background database log
        prisma.log.create({
            data: {
                level: info.level,
                message: info.message,
                meta: Object.keys(info).length > 2 ? JSON.stringify(info) : null
            }
        }).catch(err => {
            console.error('❌ Logger DB Hatası:', err);
        });

        callback();
    }
}

if (logChannels.includes('database')) {
    transports.push(new PrismaTransport() as any);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: transports
});

export default logger;

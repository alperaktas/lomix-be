const emailService = require('./emailService');

class EmailQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.stats = {
            totalAdded: 0,
            completed: 0,
            failed: 0,
            lastErrors: [],
            lastCompleted: []
        };
    }

    /**
     * Kuyruğa yeni bir email işi ekler.
     * @param {string} to - Alıcı
     * @param {string} subject - Konu
     * @param {string} text - Düz metin
     * @param {string} html - HTML içerik
     */
    add(to, subject, text, html) {
        this.queue.push({ to, subject, text, html, addedAt: new Date() });
        this.stats.totalAdded++;
        console.log(`📥 Kuyruğa eklendi. Sırada bekleyen: ${this.queue.length}`);
        this.process();
    }

    async process() {
        // Eğer şu an bir işlem yapılıyorsa veya kuyruk boşsa dur.
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const job = this.queue.shift(); // İlk işi al

        try {
            await emailService.sendEmail(job.to, job.subject, job.text, job.html);
            this.stats.completed++;
            this.stats.lastCompleted.unshift({
                to: job.to,
                subject: job.subject,
                date: new Date()
            });
            // Son 10 başarılı işlemi tut
            if (this.stats.lastCompleted.length > 10) {
                this.stats.lastCompleted.pop();
            }
        } catch (error) {
            console.error(`❌ Kuyruk Hatası (${job.to}):`, error);
            // Hata durumunda tekrar kuyruğa eklemek isterseniz: this.queue.push(job);
            this.stats.failed++;
            this.stats.lastErrors.unshift({
                to: job.to,
                error: error.message,
                date: new Date()
            });
            // Son 10 hatayı tut
            if (this.stats.lastErrors.length > 10) {
                this.stats.lastErrors.pop();
            }
        } finally {
            this.isProcessing = false;
            this.process(); // Bir sonraki işe geç
        }
    }

    getStats() {
        return {
            pending: this.queue.length,
            queue: this.queue.map(job => ({
                to: job.to,
                subject: job.subject,
                addedAt: job.addedAt
            })),
            ...this.stats
        };
    }
}

module.exports = new EmailQueue();
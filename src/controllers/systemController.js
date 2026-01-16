let si;
try {
    si = require('systeminformation');
} catch (e) {
    console.warn("⚠️ 'systeminformation' paketi yüklü değil. Sistem istatistikleri devre dışı.");
}

exports.getSystemStats = async (req, res) => {
    if (!si) {
        return res.status(503).json({
            error: "Sistem istatistikleri servisi kullanılamıyor. Lütfen 'npm install systeminformation' komutunu çalıştırın."
        });
    }

    try {
        const [cpu, mem, os, time] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.osInfo(),
            si.time()
        ]);

        res.json({
            cpu: {
                load: cpu.currentLoad.toFixed(2),
                cores: cpu.cpus.length
            },
            mem: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(2), // GB
                used: (mem.used / 1024 / 1024 / 1024).toFixed(2), // GB
                usage: ((mem.used / mem.total) * 100).toFixed(2)
            },
            os: {
                platform: os.platform,
                distro: os.distro,
            },
            uptime: time.uptime
        });
    } catch (error) {
        console.error("Sistem durumu alınırken hata:", error);
        res.status(500).json({ error: "Sunucu kaynak bilgileri alınamadı." });
    }
};
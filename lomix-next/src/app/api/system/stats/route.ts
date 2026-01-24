import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
    try {
        const uptime = os.uptime();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        // Basit CPU yükü hesabı (son 1 dk ortalaması / çekirdek sayısı)
        const cpus = os.cpus();
        const load = os.loadavg()[0] / cpus.length;

        return NextResponse.json({
            uptime,
            cpu: {
                load: (load * 100).toFixed(1),
                model: cpus[0].model,
                cores: cpus.length
            },
            mem: {
                total: (totalMem / 1024 / 1024 / 1024).toFixed(1),
                used: (usedMem / 1024 / 1024 / 1024).toFixed(1),
                usage: ((usedMem / totalMem) * 100).toFixed(1)
            }
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

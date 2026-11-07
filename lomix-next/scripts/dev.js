// Proje Windows'ta bir kısayol (junction) üzerinden açılınca Next `.next` yolunu bozuyordu
// (C:\...\F:\...\.next). Gerçek klasöre geçip öyle başlatıyoruz. Kullanım: node scripts/dev.js [next dev bayrakları]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

process.chdir(fs.realpathSync.native(path.join(__dirname, '..')));
const next = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [next, 'dev', ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));

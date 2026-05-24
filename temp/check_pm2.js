const { execSync } = require('child_process');
const exec = (c) => {
    try { return execSync(c, { encoding: 'utf8', timeout: 10000 }); }
    catch (e) { return (e.stdout || e.message || '').toString(); }
};

const list = exec('pm2 jlist');
try {
    const ps = JSON.parse(list);
    for (const p of ps) {
        console.log('PM2:', p.name, '| PID:', p.pid, '| Status:', p.pm2_env?.status, '| Uptime:', p.pm2_env?.pm_uptime, '| Restarts:', p.pm2_env?.restart_time, '| Script:', p.pm_exec_path);
    }
} catch(e) { console.log('Parse error:', e.message.substring(0, 300)); }

const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');
console.log('ocr.js has return valid:', c.includes('return { valid: true, format: ext'));
console.log('ocr.js has File accepted:', c.includes('File accepted by extension'));
console.log('ocr.js size:', c.length, 'bytes');

const i = c.indexOf('isJPEG');
console.log('isJPEG found at:', i);
if (i >= 0) console.log(c.substring(i - 20, i + 300));

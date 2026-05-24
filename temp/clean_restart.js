const { execSync } = require('child_process');
const exec = (c, opts) => {
    try { return { o: execSync(c, { encoding: 'utf8', timeout: 12000, ...opts }), c: 0 }; }
    catch (e) { return { o: e.stdout ? e.stdout.toString() : e.message, c: e.status || 1 }; }
};

const NB = '/home/nathan/.nvm/versions/node/v20.20.2/bin/node';
const SCRIPT = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/index.js';
const CWD = '/home/nathan/ocr-kb-matcher/backend';

exec('pm2 delete backend 2>/dev/null; pm2 stop backend 2>/dev/null; true');
try { execSync('sleep 3', { encoding: 'utf8', timeout: 5000 }); } catch(e) {}

const r = exec('pm2 start ' + SCRIPT + ' --name backend --cwd ' + CWD + ' --interpreter ' + NB);
console.log('Start result:', r.o.substring(0, 300));

const list = exec('pm2 jlist');
try {
    const procs = JSON.parse(list.o);
    for (const p of procs) {
        console.log('PM2:', p.name, '| PID:', p.pid, '| Restart:', p.pm2_env?.restart_time, '| Uptime:', p.pm2_env?.pm_uptime);
    }
} catch(e) { console.log('Parse error:', e.message.substring(0, 200)); }

console.log('\nPATCH CHECK:');
const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
console.log('Has extension return valid:', c.includes('return { valid: true, format: ext.replace'));
console.log('Has debug logging:', c.includes('[validateImage] path='));

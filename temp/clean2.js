const { execSync } = require('child_process');
const exec = (c) => {
    try { return execSync(c, { encoding: 'utf8', timeout: 10000 }); }
    catch (e) { return (e.stdout || e.message || '').toString(); }
};

const NB = '/home/nathan/.nvm/versions/node/v20.20.2/bin/node';
const SCRIPT = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/index.js';
const CWD = '/home/nathan/ocr-kb-matcher/backend';

exec('pm2 delete backend 2>/dev/null; pm2 stop backend 2>/dev/null; true');
try { execSync('sleep 2', { encoding: 'utf8', timeout: 4000 }); } catch(e) {}

const r = exec('pm2 start ' + SCRIPT + ' --name backend --cwd ' + CWD + ' --interpreter ' + NB);
console.log('Start:', r.substring(0, 300));

try { execSync('sleep 3', { encoding: 'utf8', timeout: 5000 }); } catch(e) {}

const list = exec('pm2 jlist');
try {
    const ps = JSON.parse(list);
    for (const p of ps) {
        if (p.name === 'backend') {
            console.log('Backend PID:', p.pid, 'Uptime:', Date.now() - new Date(p.pm2_env.pm_uptime).getTime(), 'ms');
        }
    }
} catch(e) { console.log('List:', list.substring(0, 500)); }

const logs = exec('pm2 logs backend --nostream --lines 15 2>&1');
console.log('\nBackend logs:');
console.log(logs.substring(0, 800));

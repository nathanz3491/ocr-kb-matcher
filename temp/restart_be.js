const { execSync } = require('child_process');
const exec = (c) => {
    try { return execSync(c, { encoding: 'utf8', timeout: 12000 }); }
    catch (e) { return (e.stdout || e.message || '').toString(); }
};

const NB = '/home/nathan/.nvm/versions/node/v20.20.2/bin/node';
const SCRIPT = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/index.js';
const CWD = '/home/nathan/ocr-kb-matcher/backend';

console.log('PM2 error logs:');
console.log(exec('pm2 logs backend --err --nostream --lines 20'));

console.log('General PM2 errors:');
try {
    const errLog = require('fs').readFileSync('/home/nathan/.pm2/logs/backend-error.log', 'utf8');
    const lines = errLog.split('\n');
    console.log(lines.slice(-20).join('\n'));
} catch(e) { console.log('Error reading log:', e.message); }

console.log('\nRestarting backend:');
exec('pm2 delete backend 2>/dev/null; true');
const r = exec('pm2 start ' + SCRIPT + ' --name backend --cwd ' + CWD + ' --interpreter ' + NB);
console.log(r.substring(0, 500));

const fs = require('fs');
const stats = fs.statSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js');
console.log('\nocr.js modified:', stats.mtime);

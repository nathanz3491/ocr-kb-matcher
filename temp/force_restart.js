const { execSync } = require('child_process');

const exec = (cmd, opts) => {
    try {
        return { out: execSync(cmd, { encoding: 'utf8', timeout: 10000, ...opts }), code: 0 };
    } catch (e) {
        return { out: e.stdout ? e.stdout.toString() : e.message, code: e.status || 1 };
    }
};

const nodeBin = '/home/nathan/.nvm/versions/node/v20.20.2/bin/node';
const cwd = '/home/nathan/ocr-kb-matcher/backend';
const script = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/index.js';

console.log('=== STOP PM2 ===');
console.log(exec('pm2 stop backend').out);

console.log('=== WAIT ===');
try { execSync('sleep 2', { encoding: 'utf8', timeout: 5000 }); } catch(e) {}

console.log('=== START PM2 FRESH ===');
const r = exec('pm2 start ' + script + ' --name backend --cwd ' + cwd + ' --interpreter ' + nodeBin);
console.log(r.out);

console.log('=== VERIFY STATUS ===');
console.log(exec('pm2 list'));

const { execSync } = require('child_process');
const exec = (cmd, timeout) => {
    try { return { out: execSync(cmd, { encoding: 'utf8', timeout: timeout || 15000 }), code: 0 }; }
    catch (e) { return { out: e.stdout || e.message, code: e.status || 1 }; }
};

console.log('=== PM2 STATUS ===');
console.log(exec('pm2 jlist').out);

console.log('\n=== KILL AND RESTART ===');
console.log(exec('pm2 stop backend'));
console.log(exec('pm2 delete backend 2>/dev/null || true'));

const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');
console.log('PATCH PRESENT:', c.includes('File accepted by extension check') ? 'YES' : 'NO');

console.log('\n=== STARTING FRESH ===');
const startScript = '/home/nathan/start_be.sh';
let startContent;
try {
    startContent = fs.readFileSync(startScript, 'utf8');
    console.log('Start script found:', startScript);
} catch(e) {
    try {
        const alt = '/home/nathan/start_backend.sh';
        startContent = fs.readFileSync(alt, 'utf8');
        console.log('Alt start script:', alt);
    } catch(e2) {
        console.log('No start script found. Using direct start...');
        const pkg = JSON.parse(fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/package.json', 'utf8'));
        const main = pkg.main || 'dist/index.js';
        const nodePath = '/home/nathan/.nvm/versions/node/v20.20.2/bin/node';
        const env = Object.assign({}, process.env, { PATH: '/home/nathan/.nvm/versions/node/v20.20.2/bin:' + process.env.PATH });
        const result = execSync(nodePath + ' ' + main + ' &', { encoding: 'utf8', cwd: '/home/nathan/ocr-kb-matcher/backend', detached: true, stdio: 'ignore' });
        console.log('Started in background');
    }
}

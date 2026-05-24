const { execSync } = require('child_process');
const exec = (cmd) => {
    console.log('EXEC:', cmd);
    try { return execSync(cmd, { encoding: 'utf8', timeout: 30000 }); }
    catch (e) { return 'ERROR: ' + e.message; }
};

console.log('Stopping backend...');
console.log(exec('pm2 stop backend'));
console.log(exec('pm2 delete backend 2>/dev/null || true'));

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const fs = require('fs');
const c = fs.readFileSync(ocrPath, 'utf8');
const hasPatch = c.includes('File accepted by extension check');
console.log('PATCH IN FILE:', hasPatch ? 'YES' : 'NO');

console.log('\nStarting backend fresh...');
console.log(exec('cd /home/nathan/ocr-kb-matcher/backend && /home/nathan/.nvm/versions/node/v20.20.2/bin/node dist/backend/src/index.js &'));
console.log(exec('sleep 2 && pm2 list'));

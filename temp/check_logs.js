const { execSync } = require('child_process');
const exec = (c) => {
    try { return execSync(c, { encoding: 'utf8', timeout: 10000 }); }
    catch (e) { return (e.stdout || e.message || '').toString(); }
};

const logs = [
    '/home/nathan/.pm2/logs/backend-out-0.log',
    '/home/nathan/.pm2/logs/backend-out.log',
    '/home/nathan/.pm2/logs/backend-error-0.log',
    '/home/nathan/.pm2/logs/backend-error.log',
    '/home/nathan/ocr-kb-matcher/backend/backend.log',
    '/home/nathan/ocr-kb-matcher/backend.log',
];

for (const lf of logs) {
    try {
        const fs = require('fs');
        const c = fs.readFileSync(lf, 'utf8');
        const lines = c.split('\n');
        console.log(lf, '| Size:', c.length, 'bytes | Lines:', lines.length);
        console.log('Last 5:', lines.slice(-5).join('\n'));
        console.log('---');
    } catch(e) {
        console.log(lf, 'ERROR:', e.message);
    }
}

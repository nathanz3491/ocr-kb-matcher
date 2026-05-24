const fs = require('fs');
const paths = [
    '/home/nathan/.pm2/logs/backend-error-0.log',
    '/home/nathan/.pm2/logs/backend-out-0.log',
    '/home/nathan/ocr-kb-matcher/backend/backend.log',
];
for (const p of paths) {
    try {
        const stats = fs.statSync(p);
        console.log(p, '-', stats.size, 'bytes, modified:', stats.mtime);
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split('\n');
        console.log('Lines:', lines.length, '- Last 5:');
        console.log(lines.slice(-5).join('\n'));
    } catch(e) {
        console.log(p, 'ERROR:', e.message);
    }
}

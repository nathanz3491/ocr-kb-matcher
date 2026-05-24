const fs = require('fs');

const paths = [
    '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js',
    '/home/nathan/ocr-kb-matcher/dist/backend/src/services/ocr.js',
    '/home/nathan/ocr-kb-matcher/backend/dist/services/ocr.js',
];

for (const p of paths) {
    try {
        const s = fs.statSync(p);
        const c = fs.readFileSync(p, 'utf8');
        const hasPatch = c.includes('File accepted by extension check');
        console.log(p, '\n  Size:', s.size, 'Modified:', s.mtime, '\n  Patch:', hasPatch ? 'YES' : 'NO');
        if (hasPatch) {
            const i = c.indexOf('File accepted by extension check');
            console.log('  Context:', c.substring(i - 50, i + 150));
        }
    } catch(e) {
        console.log(p, 'ERROR:', e.message);
    }
}

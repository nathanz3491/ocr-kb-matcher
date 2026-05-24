const fs = require('fs');

const paths = [
    '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/index.js',
    '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/app.js',
    '/home/nathan/ocr-kb-matcher/backend/dist/index.js',
    '/home/nathan/ocr-kb-matcher/backend/dist/backend/index.js',
];

for (const p of paths) {
    try {
        const c = fs.readFileSync(p, 'utf8');
        const hasOcr = c.includes('./services/ocr') || c.includes('services/ocr');
        console.log(p, '| Size:', c.length, '| Has ocr import:', hasOcr);
    } catch(e) {
        console.log(p, '| ERROR:', e.message);
    }
}

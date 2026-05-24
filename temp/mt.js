const fs = require('fs');
const path = require('path');

const files = [
    '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js',
    '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/jobProcessor.js',
    '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/index.js',
];

for (const f of files) {
    try {
        const s = fs.statSync(f);
        console.log(f);
        console.log('  Size:', s.size, 'Modified:', s.mtime);
    } catch(e) {
        console.log(f, 'ERROR:', e.message);
    }
}

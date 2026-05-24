const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');

const lines = c.split('\n');
let inFn = false;
let count = 0;
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('validateImage')) {
        inFn = true;
        count = 0;
    }
    if (inFn) {
        console.log(i + 1 + '|' + l);
        count++;
        if (count > 80 && l.trim() === '}') { inFn = false; break; }
        if (i > 150) break;
    }
}

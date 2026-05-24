const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');

const lines = c.split('\n');
let fnStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('validateImage')) { fnStart = i; break; }
}
if (fnStart < 0) { console.log('NOT FOUND'); process.exit(1); }

let exportLine = -1;
for (let i = fnStart; i < lines.length && i < fnStart + 150; i++) {
    if (lines[i].includes('exports.validateImage')) { exportLine = i; break; }
}
console.log('fnStart:', fnStart, 'exportLine:', exportLine);
if (exportLine > fnStart) {
    for (let i = fnStart; i <= exportLine && i < fnStart + 10; i++) {
        console.log(i + 1 + ': ' + lines[i]);
    }
}

const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');
let pos = 0;
let count = 0;
while (true) {
    const i = c.indexOf('const tesseract_js_1 = require("tesseract.js");', pos);
    if (i < 0) break;
    console.log('Found at byte:', i, 'line:', c.substring(0, i).split('\n').length);
    pos = i + 1;
    count++;
}
console.log('Total occurrences:', count);
console.log('File length:', c.length);

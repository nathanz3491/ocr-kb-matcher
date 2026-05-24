const fs = require('fs');
const c = fs.readFileSync('C:/Users/64887/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
const lines = c.split('\n');
console.log('Local ocr.js: total lines:', lines.length, 'total bytes:', c.length);

const tis = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const tesseract_js_1 = require')) tis.push(i);
    if (lines[i].includes('validateImage')) console.log((i + 1) + ': ' + lines[i]);
}
console.log('Tesseract occurrences:', tis.length);
console.log('First 10 lines:');
for (let i = 0; i < 10; i++) console.log((i + 1) + ': ' + lines[i]);
console.log('Lines 40-55:');
for (let i = 39; i < 55; i++) console.log((i + 1) + ': ' + lines[i]);
console.log('Lines 75-130:');
for (let i = 74; i < 130; i++) console.log((i + 1) + ': ' + lines[i]);

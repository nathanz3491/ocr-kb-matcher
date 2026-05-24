const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const lines = fs.readFileSync(ocrPath, 'utf8').split('\n');
console.log('Lines 46-80:');
for (let i = 45; i < 80; i++) console.log((i + 1) + ': ' + lines[i]);
console.log('Total lines:', lines.length);

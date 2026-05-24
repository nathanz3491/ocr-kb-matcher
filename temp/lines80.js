const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const lines = fs.readFileSync(ocrPath, 'utf8').split('\n');
console.log('Lines 78-130:');
for (let i = 77; i < 130; i++) console.log((i + 1) + ': ' + lines[i]);

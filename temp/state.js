const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');

const fnStart = c.indexOf('async function validateImage(imagePath) {');
const exportIdx = c.indexOf('exports.validateImage');
const fnEnd = c.indexOf('\n}', exportIdx);

console.log('=== validateImage function in compiled JS ===');
console.log('Function start index:', fnStart);
console.log('Export index:', exportIdx);
console.log('Function end index:', fnEnd);
console.log('');
console.log('=== FUNCTION BODY ===');
console.log(c.substring(fnStart, fnEnd + 2));
console.log('');
console.log('=== AFTER FUNCTION (up to export) ===');
console.log(c.substring(fnEnd + 2, exportIdx + 50));

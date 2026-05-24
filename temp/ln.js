const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const marker = 'async function validateImage(imagePath) {';
if (!c.includes(marker)) { console.log('MARKER NOT FOUND'); process.exit(1); }

const replacement = marker + '\n    console.log("[validateImage] ENTER path=" + imagePath);';

c = c.replace(marker, replacement);
fs.writeFileSync(ocrPath, c);
console.log('PATCHED');

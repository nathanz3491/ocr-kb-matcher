const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const marker = "async function validateImage(imagePath) {";
if (!c.includes(marker)) {
    console.log('MARKER NOT FOUND');
    const i = c.indexOf('validateImage');
    console.log('validateImage at:', i, i >= 0 ? c.substring(i, i + 200) : '');
    process.exit(1);
}

const debugLog = "console.log('[validateImage] CALLED with path:', imagePath);";
const replacement = "async function validateImage(imagePath) {\n    " + debugLog;

c = c.replace(marker, replacement);
fs.writeFileSync(ocrPath, c);
console.log('PATCHED: added entry log to validateImage');

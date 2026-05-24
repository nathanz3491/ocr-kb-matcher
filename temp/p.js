const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const target = "return { valid: false, error: 'Invalid image format' }";
const replacement = "console.log('[validateImage] REJECTING - invalid format. ext was:', ext, 'known:', JSON.stringify(knownExtensions)); return { valid: false, error: 'Invalid image format' }";

if (!c.includes(target)) {
    console.log('TARGET NOT FOUND');
    const i = c.indexOf("'Invalid image format'");
    console.log("'Invalid image format' at:", i);
    if (i >= 0) console.log(c.substring(i - 200, i + 200));
} else {
    c = c.replace(target, replacement);
    fs.writeFileSync(ocrPath, c);
    console.log('PATCHED with debug at rejection point');
}

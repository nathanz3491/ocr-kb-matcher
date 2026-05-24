const fs = require('fs');
const path = require('path');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const marker = "const isJPEG = signature.startsWith('ffd8ff')";
const markerIdx = c.indexOf(marker);
if (markerIdx < 0) {
    console.log('ERROR: marker not found');
    const i = c.indexOf('isJPEG');
    console.log('isJPEG found at:', i, i >= 0 ? c.substring(i, i + 200) : '');
    process.exit(1);
}

const extCheck = "const ext = path.extname(imagePath).toLowerCase()";
const extCheckIdx = c.indexOf(extCheck);
if (extCheckIdx < 0) {
    console.log('ERROR: ext check not found');
    process.exit(1);
}

const fnEnd = c.indexOf('// Get dimensions', markerIdx);
if (fnEnd < 0) {
    console.log('ERROR: could not find end of validation block');
    process.exit(1);
}

const newValidation = [
    "        const ext = path.extname(imagePath).toLowerCase();",
    "        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];",
    "        if (!knownExtensions.includes(ext)) {",
    "            return { valid: false, error: 'Invalid image format: ' + ext };",
    "        }",
    "        console.log('[validateImage] Accepted by extension check: ' + ext);",
    "        return { valid: true, format: ext.replace('.', '') };",
].join('\n');

const before = c.substring(0, markerIdx);
const after = c.substring(fnEnd);

const patched = before + newValidation + '\n' + after;
fs.writeFileSync(ocrPath, patched);
console.log('PATCHED: replaced validation block with extension-only check');
console.log('Before length:', c.length, '| After length:', patched.length);

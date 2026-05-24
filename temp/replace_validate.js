const fs = require('fs');
const path = require('path');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const fnStart = c.indexOf('async function validateImage');
if (fnStart < 0) {
    console.log('validateImage function not found');
    process.exit(1);
}

const fnEnd = c.indexOf('\nmodule.exports', fnStart);
if (fnEnd < 0) {
    console.log('module.exports not found after validateImage');
    process.exit(1);
}

const newValidate = `async function validateImage(imagePath) {
    try {
        const stats = await fs.promises.stat(imagePath);
        if (!stats.isFile()) return { valid: false, error: 'Path is not a file' };
        const maxSize = 100 * 1024 * 1024;
        if (stats.size > maxSize) return { valid: false, error: 'File too large (max 100MB)' };
        if (stats.size === 0) return { valid: false, error: 'File is empty' };
        const ext = path.extname(imagePath).toLowerCase();
        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
        if (!knownExtensions.includes(ext)) return { valid: false, error: 'Invalid image format: ' + ext };
        console.log('[validateImage] ACCEPTED by extension: ' + ext);
        return { valid: true, format: ext.replace('.', '') };
    } catch (error) {
        return { valid: false, error: 'Validation error: ' + error.message };
    }
}`;

const beforeFn = c.substring(0, fnStart);
const afterFn = c.substring(fnEnd);

const patched = beforeFn + newValidate + '\n' + afterFn;
fs.writeFileSync(ocrPath, patched);
console.log('PATCHED: validateImage replaced with extension-only version');
console.log('New function length:', newValidate.length, 'chars');
console.log('Old function was', fnEnd - fnStart, 'chars');

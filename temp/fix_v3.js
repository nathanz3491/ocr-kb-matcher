const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const vi = c.indexOf('async function validateImage(imagePath) {');
const ti = c.indexOf('exports.validateImage = validateImage;');
const ri = c.indexOf('const tesseract_js_1 = require("tesseract.js");');

console.log('validateImage starts at:', vi);
console.log('exports.validateImage at:', ti);
console.log('require tesseract at:', ri);

if (vi < 0 || ti < 0 || ri < 0) { console.log('CANNOT FIX'); process.exit(1); }

const section1 = c.substring(0, ti);
const section2 = c.substring(ti, ri);
const section3 = c.substring(ri);

const newFn = `async function validateImage(imagePath) {
    try {
        const stats = await fs.promises.stat(imagePath);
        if (!stats.isFile()) return { valid: false, error: 'Path is not a file' };
        if (stats.size > 100 * 1024 * 1024) return { valid: false, error: 'File too large (max 100MB)' };
        if (stats.size === 0) return { valid: false, error: 'File is empty' };
        const ext = path.extname(imagePath).toLowerCase();
        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
        console.log('[validateImage] path=' + imagePath + ' ext=' + ext + ' size=' + stats.size);
        if (knownExtensions.includes(ext)) {
            console.log('[validateImage] ACCEPTED ext=' + ext);
            return { valid: true, format: ext.replace('.', '') };
        }
        console.log('[validateImage] REJECTED unknown ext=' + ext);
        return { valid: false, error: 'Invalid image format: ' + ext };
    } catch (error) {
        console.log('[validateImage] ERROR ' + (error.message || error));
        return { valid: false, error: 'Validation error: ' + (error.message || 'unknown') };
    }
}`;

const newFile = section1 + '\n' + newFn + '\n' + section2 + '\n' + section3;
fs.writeFileSync(ocrPath, newFile);
console.log('Fixed. Old len:', c.length, 'New len:', newFile.length);

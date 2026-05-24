const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');

const fnStartMarker = 'async function validateImage(imagePath) {';
const fnStart = c.indexOf(fnStartMarker);
if (fnStart < 0) { console.log('FUNC NOT FOUND'); process.exit(1); }

const exportIdx = c.indexOf('exports.validateImage');
if (exportIdx < 0) { console.log('EXPORT NOT FOUND'); process.exit(1); }

const newValidateFn = `async function validateImage(imagePath) {
    try {
        const stats = await fs.stat(imagePath);
        if (!stats.isFile()) return { valid: false, error: 'Path is not a file' };
        if (stats.size > 100 * 1024 * 1024) return { valid: false, error: 'File too large (max 100MB)' };
        if (stats.size === 0) return { valid: false, error: 'File is empty' };
        const ext = path.extname(imagePath).toLowerCase();
        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
        if (knownExtensions.includes(ext)) {
            console.log('[validateImage] ACCEPTED ext=' + ext + ' path=' + imagePath);
            return { valid: true, format: ext.replace('.', '') };
        }
        return { valid: false, error: 'Invalid image format: ' + ext };
    } catch (error) {
        return { valid: false, error: 'Validation error: ' + (error.message || 'unknown') };
    }
}`;

const newFile = c.substring(0, fnStart) + newValidateFn + '\n' + c.substring(exportIdx);
fs.writeFileSync(ocrPath, newFile);
console.log('REPLACED validateImage function');
console.log('Old length:', c.length, 'New length:', newFile.length);

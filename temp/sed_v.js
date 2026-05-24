const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let lines = fs.readFileSync(ocrPath, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('async function validateImage(imagePath) {'));
if (startIdx < 0) { console.log('START NOT FOUND'); process.exit(1); }

let braceCount = 0;
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    braceCount += (lines[i].match(/{/g) || []).length;
    braceCount -= (lines[i].match(/}/g) || []).length;
    if (braceCount === 0 && i > startIdx) { endIdx = i; break; }
}
if (endIdx < 0) { console.log('END NOT FOUND'); process.exit(1); }

console.log('Found validateImage at lines', startIdx + 1, '-', endIdx + 1, '(braceCount=0)');
console.log('Lines to replace:', endIdx - startIdx);

const newFn = [
    'async function validateImage(imagePath) {',
    '    try {',
    '        const stats = await fs.promises.stat(imagePath);',
    '        if (!stats.isFile()) return { valid: false, error: \'Path is not a file\' };',
    '        if (stats.size > 100 * 1024 * 1024) return { valid: false, error: \'File too large (max 100MB)\' };',
    '        if (stats.size === 0) return { valid: false, error: \'File is empty\' };',
    '        const ext = path.extname(imagePath).toLowerCase();',
    '        const knownExtensions = [\'.jpg\', \'.jpeg\', \'.png\', \'.gif\', \'.webp\', \'.bmp\', \'.tiff\', \'.tif\'];',
    '        console.log(\'[validateImage] path=\' + imagePath + \' ext=\' + ext + \' size=\' + stats.size);',
    '        if (knownExtensions.includes(ext)) {',
    '            console.log(\'[validateImage] ACCEPTED ext=\' + ext);',
    '            return { valid: true, format: ext.replace(\'.\', \'\') };',
    '        }',
    '        console.log(\'[validateImage] REJECTED unknown ext=\' + ext);',
    '        return { valid: false, error: \'Invalid image format: \' + ext };',
    '    } catch (error) {',
    '        console.log(\'[validateImage] ERROR \' + (error.message || error));',
    '        return { valid: false, error: \'Validation error: \' + (error.message || \'unknown\') };',
    '    }',
    '}',
];

const newLines = [...lines.slice(0, startIdx), ...newFn, ...lines.slice(endIdx + 1)];
fs.writeFileSync(ocrPath, newLines.join('\n'));
console.log('Done. Old lines:', lines.length, 'New lines:', newLines.length);

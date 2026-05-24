const fs = require('fs');
const vm = require('vm');

const localPath = 'C:/Users/64887/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const lines = fs.readFileSync(localPath, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('async function validateImage(imagePath) {'));
if (startIdx < 0) { console.log('START NOT FOUND'); process.exit(1); }

let braceCount = 0;
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    braceCount += (lines[i].match(/{/g) || []).length;
    braceCount -= (lines[i].match(/}/g) || []).length;
    if (braceCount === 0 && i > startIdx) { endIdx = i; break; }
}
console.log('validateImage: lines', startIdx + 1, '-', endIdx + 1, '(replacing', endIdx - startIdx + 1, 'lines)');

const newFn = [
    'async function validateImage(imagePath) {',
    '    try {',
    '        const stats = await fs.stat(imagePath);',
    '        if (!stats.isFile()) return { valid: false, error: \'Path is not a file\' };',
    '        if (stats.size > 100 * 1024 * 1024) return { valid: false, error: \'File too large (max 100MB)\' };',
    '        if (stats.size === 0) return { valid: false, error: \'File is empty\' };',
    '        const ext = path.extname(imagePath).toLowerCase();',
    '        const knownExtensions = [\'.jpg\', \'.jpeg\', \'.png\', \'.gif\', \'.webp\', \'.bmp\', \'.tiff\', \'.tif\'];',
    '        if (knownExtensions.includes(ext)) {',
    '            return { valid: true, format: ext.replace(\'.\', \'\') };',
    '        }',
    '        return { valid: false, error: \'Invalid image format: \' + ext };',
    '    } catch (error) {',
    '        return { valid: false, error: \'Validation error: \' + (error.message || \'unknown\') };',
    '    }',
    '}',
];

const newLines = [...lines.slice(0, startIdx), ...newFn, ...lines.slice(endIdx + 1)];
const newContent = newLines.join('\n');

try {
    new vm.Script(newContent);
    console.log('SYNTAX OK');
} catch(e) {
    console.log('SYNTAX ERROR:', e.message);
    process.exit(1);
}

fs.writeFileSync(localPath, newContent);
console.log('Written. Old lines:', lines.length, 'New lines:', newLines.length);

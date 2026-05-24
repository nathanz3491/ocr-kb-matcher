const fs = require('fs');
const path = require('path');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const content = fs.readFileSync(ocrPath, 'utf8');

const oldBlock = [
    "        const isJPEG = signature.startsWith('ffd8ff');",
    "        const isPNG = signature.startsWith('89504e47');",
    "        const isGIF = signature.startsWith('47494638');",
    "        const isBMP = signature.startsWith('424d');",
    "        const isWebP = signature.startsWith('52494646') && buffer.slice(8, 12).toString('hex') === '57454250';",
    "        const isTIFF = signature.startsWith('49492a00') || signature.startsWith('4d4d002a');",
    "        if (!isJPEG && !isPNG && !isGIF && !isBMP && !isWebP && !isTIFF) {",
    "            const ext = path.extname(imagePath).toLowerCase();",
    "            const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];",
    "            if (!knownExtensions.includes(ext)) {",
    "                return { valid: false, error: 'Invalid image format' };",
    "            }",
    "            console.log('[validateImage] Magic bytes mismatch but extension ' + ext + ' is known -- accepting by extension fallback');",
    "        }",
].join('\n');

const newBlock = [
    "        const ext = path.extname(imagePath).toLowerCase();",
    "        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];",
    "        if (!knownExtensions.includes(ext)) {",
    "            return { valid: false, error: 'Invalid image format' };",
    "        }",
    "        console.log('[validateImage] File accepted by extension check: ' + ext);",
    "        return { valid: true, format: ext.replace('.', '') };",
].join('\n');

if (content.includes(oldBlock)) {
    const patched = content.replace(oldBlock, newBlock);
    fs.writeFileSync(ocrPath, patched);
    console.log('PATCHED OK - extension-only validation applied');
} else {
    console.log('OLD PATTERN NOT FOUND');
    const i = content.indexOf('const isJPEG');
    if (i >= 0) console.log('isJPEG at:', content.substring(i - 10, i + 500));
    else console.log('isJPEG NOT in file');
}

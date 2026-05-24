const fs = require('fs');
const path = require('path');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const content = fs.readFileSync(ocrPath, 'utf8');

const old = [
    '        if (!isJPEG && !isPNG && !isGIF && !isBMP && !isWebP && !isTIFF) {',
    "            const ext = path.extname(imagePath).toLowerCase();",
    "            const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];",
    "            if (!knownExtensions.includes(ext)) {",
    "                return { valid: false, error: 'Invalid image format' };",
    "            }",
    "            console.log('[validateImage] Magic bytes mismatch but extension ' + ext + ' is known -- accepting by extension fallback');",
    "        }",
].join('\n');

const replacement = [
    '        const ext = path.extname(imagePath).toLowerCase();',
    "        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];",
    "        if (!knownExtensions.includes(ext)) {",
    "            return { valid: false, error: 'Invalid image format - unknown extension: ' + ext };",
    "        }",
    "        console.log('[validateImage] File accepted by extension check: ' + ext);",
    "        return { valid: true, format: ext.replace('.', '') };",
].join('\n');

if (content.includes(old)) {
    const patched = content.replace(old, replacement);
    fs.writeFileSync(ocrPath, patched);
    console.log('PATCHED OK - extension-only validation');
} else {
    console.log('OLD PATTERN NOT FOUND');
    const i = content.indexOf('knownExtensions');
    if (i >= 0) console.log('knownExtensions found at:', content.substring(i - 50, i + 200));
    else console.log('knownExtensions NOT in file at all');
}

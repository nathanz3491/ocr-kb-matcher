const fs = require('fs');
const path = require('path');

function findFile(dir, name) {
    let found = null;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isFile() && entry.name === name) {
                found = full;
                break;
            }
            if (entry.isDirectory() && !['node_modules', '.git', 'cache'].includes(entry.name)) {
                found = findFile(full, name);
                if (found) break;
            }
        }
    } catch {}
    return found;
}

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
console.log('Patching:', ocrPath);
const content = fs.readFileSync(ocrPath, 'utf8');
const marker = "return { valid: false, error: 'Invalid image format' }";
if (!content.includes(marker)) { console.log('MARKER NOT FOUND'); process.exit(1); }
const old = "        if (!isJPEG && !isPNG && !isGIF && !isBMP && !isWebP && !isTIFF) {\n            return { valid: false, error: 'Invalid image format' };\n        }";
const newCode = [
    "        if (!isJPEG && !isPNG && !isGIF && !isBMP && !isWebP && !isTIFF) {",
    "            const ext = path.extname(imagePath).toLowerCase();",
    "            const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];",
    "            if (!knownExtensions.includes(ext)) {",
    "                return { valid: false, error: 'Invalid image format' };",
    "            }",
    "            console.log('[validateImage] Magic bytes mismatch but extension ' + ext + ' is known -- accepting by extension fallback');",
    "        }",
].join('\n');
if (content.includes(old)) {
    fs.writeFileSync(ocrPath, content.replace(old, newCode));
    console.log('PATCHED OK');
} else {
    const idx = content.indexOf(marker);
    console.log('OLD PATTERN NOT FOUND. Snippet:', content.substring(Math.max(0, idx - 200), idx + 200));
}

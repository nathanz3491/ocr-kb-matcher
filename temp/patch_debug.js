const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const oldBlock = "        const ext = path.extname(imagePath).toLowerCase();\n        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];\n        if (knownExtensions.includes(ext)) {\n            console.log('[validateImage] File accepted by extension check: ' + ext);\n            return { valid: true, format: ext.replace('.', '') };\n        }";

const newBlock = "        const ext = path.extname(imagePath).toLowerCase();\n        console.log('[validateImage] path=' + imagePath + ' ext=' + ext + ' knownExt=[' + ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'].join(',') + ']');\n        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];\n        if (knownExtensions.includes(ext)) {\n            console.log('[validateImage] ACCEPTED by extension');\n            return { valid: true, format: ext.replace('.', '') };\n        } else {\n            console.log('[validateImage] REJECTED - unknown extension');\n        }";

if (c.includes(oldBlock)) {
    c = c.replace(oldBlock, newBlock);
    fs.writeFileSync(ocrPath, c);
    console.log('PATCHED with debug logging');
} else {
    console.log('OLD PATTERN NOT FOUND');
    const i = c.indexOf('knownExtensions');
    if (i >= 0) console.log(c.substring(i - 100, i + 500));
}

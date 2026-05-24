const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const old = "const ext = path.extname(imagePath).toLowerCase();\n        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];\n        if (knownExtensions.includes(ext)) {\n            console.log('[validateImage] File accepted by extension check: ' + ext);\n            return { valid: true, format: ext.replace('.', '') };\n        }";

const replacement = "const ext = path.extname(imagePath).toLowerCase();\n        console.log('[validateImage DEBUG] imagePath=' + imagePath + ' ext=' + ext);\n        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];\n        if (knownExtensions.includes(ext)) {\n            console.log('[validateImage] File accepted by extension check: ' + ext);\n            return { valid: true, format: ext.replace('.', '') };\n        }";

if (c.includes(old)) {
    c = c.replace(old, replacement);
    fs.writeFileSync(ocrPath, c);
    console.log('DEBUG LOGGING ADDED');
} else {
    console.log('PATTERN NOT FOUND');
    const i = c.indexOf('knownExtensions');
    if (i >= 0) console.log('Context:', c.substring(i - 100, i + 300));
}

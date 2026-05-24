const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const search = "        const ext = path.extname(imagePath).toLowerCase();\n        console.log('[validateImage DEBUG] imagePath=' + imagePath + ' ext=' + ext);\n        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];";

if (c.includes(search)) {
    console.log('Debug already added');
} else {
    const target = "        const ext = path.extname(imagePath).toLowerCase();\n        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];";
    if (c.includes(target)) {
        c = c.replace(target, search);
        fs.writeFileSync(ocrPath, c);
        console.log('Debug logging added');
    } else {
        console.log('Target not found. Current content around knownExtensions:');
        const i = c.indexOf("knownExtensions = ");
        if (i >= 0) console.log(c.substring(i - 200, i + 400));
    }
}

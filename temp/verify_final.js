const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');

console.log('File length:', c.length);

const markers = [
    "return { valid: true, format: ext.replace",
    "File accepted by extension",
    "if (!isJPEG && !isPNG && !isGIF",
    "knownExtensions = ",
    "Invalid image format"
];

for (const m of markers) {
    const i = c.indexOf(m);
    console.log(m.substring(0, 50) + '... | ' + (i >= 0 ? 'FOUND at ' + i : 'NOT FOUND'));
    if (i >= 0 && m.includes('valid: true')) {
        console.log('  Context:', c.substring(i - 50, i + 150));
    }
}

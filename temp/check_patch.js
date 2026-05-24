const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
const marker = 'knownExtensions';
const i = c.indexOf(marker);
if (i >= 0) {
    console.log('PATCH PRESENT:', c.substring(i - 50, i + 250));
} else {
    console.log('PATCH MISSING - knownExtensions not in compiled ocr.js');
    const j = c.indexOf("'Invalid image format'");
    if (j >= 0) console.log('Invalid image format at:', c.substring(j - 300, j + 100));
}

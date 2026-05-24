const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
const i = c.indexOf('knownExtensions');
if (i >= 0) {
    console.log('PATCH VERIFIED:', c.substring(i - 50, i + 200));
} else {
    console.log('PATCH NOT FOUND - knownExtensions not in file');
}

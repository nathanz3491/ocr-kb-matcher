const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
const i = c.indexOf("const isJPEG = signature.startsWith('ffd8ff')");
if (i >= 0) {
    console.log(c.substring(i - 400, i));
}

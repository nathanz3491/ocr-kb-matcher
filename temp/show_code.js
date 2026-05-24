const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');

const i = c.indexOf('if (!isJPEG && !isPNG');
if (i >= 0) {
    console.log(c.substring(i - 50, i + 800));
}

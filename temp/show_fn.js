const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');

const fnStart = c.indexOf('async function validateImage');
if (fnStart < 0) {
    console.log('validateImage not found');
} else {
    console.log(c.substring(fnStart, fnStart + 2000));
}

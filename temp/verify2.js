const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
const i = c.indexOf('File accepted by extension check');
if (i >= 0) {
    console.log('PATCH VERIFIED:', c.substring(i - 30, i + 150));
} else {
    console.log('PATCH NOT APPLIED');
}

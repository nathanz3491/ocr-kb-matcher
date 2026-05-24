const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
const i = c.indexOf('async function validateImage');
if (i >= 0) {
    console.log('validateImage starts at:', i);
    console.log(c.substring(i, i + 100));
} else {
    const j = c.indexOf('function validateImage');
    if (j >= 0) {
        console.log('Non-async validateImage at:', j);
        console.log(c.substring(j, j + 100));
    } else {
        console.log('validateImage NOT FOUND');
        console.log('Functions containing validate:', c.split('\n').filter(l => l.includes('validate')).join('\n'));
    }
}

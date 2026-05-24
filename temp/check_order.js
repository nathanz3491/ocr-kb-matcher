const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');

const i = c.indexOf('if (!isJPEG && !isPNG');
const j = c.indexOf('hasImageMagick');
const k = c.indexOf('return { valid: true, format: ext');

console.log('Magic bytes check at char:', i);
console.log('hasImageMagick at char:', j);
console.log('Extension return valid at char:', k);

if (i >= 0 && j >= 0 && k >= 0) {
    console.log('\nOrder check:');
    console.log('  Magic bytes:', i, i < j ? 'FIRST' : 'AFTER hasImageMagick');
    console.log('  Extension return:', k, k < j ? 'BEFORE hasImageMagick' : 'AFTER hasImageMagick');
}

if (k >= 0) {
    console.log('\nContext around extension return:');
    console.log(c.substring(k - 100, k + 200));
}

const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');

const checks = [
    ['knownExtensions check returns valid', "return { valid: true, format: ext.replace('.', '') }"],
    ['magic bytes block still there', "if (!isJPEG && !isPNG && !isGIF"],
    ['invalid image returns correctly', "return { valid: false, error: 'Invalid image format' }"],
];

for (const [name, pattern] of checks) {
    const found = c.includes(pattern);
    console.log(found ? '[OK]' : '[MISSING]', name, '|', found ? 'found' : 'NOT found: ' + pattern);
}

const i = c.indexOf('if (!isJPEG && !isPNG && !isGIF');
if (i >= 0) {
    console.log('\nContext around magic bytes check:');
    console.log(c.substring(i, i + 400));
}

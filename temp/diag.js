const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let content = fs.readFileSync(ocrPath, 'utf8');

const before = content.indexOf("'Invalid image format'");
console.log("'Invalid image format' at:", before);
if (before >= 0) console.log("Context:", content.substring(before - 200, before + 200));

const i = content.indexOf('knownExtensions');
if (i >= 0) {
    console.log('knownExtensions FOUND. Context:', content.substring(i - 200, i + 300));
} else {
    console.log('knownExtensions NOT in compiled file - patch was NOT applied!');
}

const j = content.indexOf('isJPEG');
if (j >= 0) {
    console.log('isJPEG found. Context:', content.substring(j - 20, j + 400));
}

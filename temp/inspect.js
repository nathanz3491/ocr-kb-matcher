const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');

const vi = c.indexOf('async function validateImage(imagePath) {');
const ti = c.indexOf('exports.validateImage = validateImage;');
const ti2 = c.indexOf('exports.validateImage = validateImage;', ti + 1);
const ri = c.indexOf('const tesseract_js_1 = require("tesseract.js");');

console.log('vi (validateImage fn):', vi);
console.log('ti (first export):', ti);
console.log('ti2 (second export):', ti2);
console.log('ri (require tesseract):', ri);

const snippet = c.substring(ti + 60, ti + 300);
console.log('\nBetween first export and tesseract:\n' + snippet);

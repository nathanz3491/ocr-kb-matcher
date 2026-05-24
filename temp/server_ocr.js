const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');

console.log('Total bytes:', c.length);
console.log('Total lines:', c.split('\n').length);

const lines = c.split('\n');
console.log('\n--- First 10 lines ---');
for (let i = 0; i < 10; i++) console.log((i+1) + ': ' + lines[i]);

const exIdx = lines.findIndex(l => l.includes('exports.validateImage'));
console.log('\n--- Lines around exports (line', exIdx + 1, ') ---');
for (let i = exIdx - 2; i < exIdx + 10 && i < lines.length; i++) console.log((i+1) + ': ' + lines[i]);

const viIdx = lines.findIndex(l => l.includes('async function validateImage'));
console.log('\n--- validateImage function (line', viIdx + 1, ') ---');
for (let i = viIdx; i < viIdx + 25 && i < lines.length; i++) console.log((i+1) + ': ' + lines[i]);

const incIdx = lines.findIndex(l => l.includes('.includes('));
console.log('\n--- First .includes() call (line', incIdx + 1, ') ---');
console.log(lines[incIdx]);

const errLine = lines.findIndex(l => l.includes('validation.error') || l.includes('OCR failed'));
if (errLine >= 0) {
    console.log('\n--- validation/OCR error lines ---');
    for (let i = errLine; i < errLine + 10 && i < lines.length; i++) console.log((i+1) + ': ' + lines[i]);
}

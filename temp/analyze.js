const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');
const lines = c.split('\n');
console.log('Total lines:', lines.length);
for (let i = 0; i < 20; i++) console.log((i + 1) + ': ' + lines[i]);
const vi = lines.findIndex(l => l.includes('validateImage'));
console.log('First validateImage at:', vi + 1);
for (let i = vi; i < vi + 15 && i < lines.length; i++) console.log((i + 1) + ': ' + lines[i]);
console.log('--- searching for fs.stat usage ---');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fs.stat') || lines[i].includes('fs.promises') || lines[i].includes('fs.default')) {
        console.log((i + 1) + ': ' + lines[i]);
    }
}

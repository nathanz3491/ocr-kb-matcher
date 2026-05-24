const fs = require('fs');
const lines = require('fs').readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.includes(')) {
        console.log('Line ' + (i+1) + ': ' + lines[i]);
    }
}
console.log('Total lines:', lines.length);

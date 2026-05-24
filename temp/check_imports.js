const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');

const lines = c.split('\n').slice(0, 20);
for (let i = 0; i < lines.length; i++) {
    console.log(i + 1 + '|' + lines[i]);
}

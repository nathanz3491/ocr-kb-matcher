const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');

const lines = c.split('\n');
let inValidate = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('async function validateImage') || lines[i].includes('validateImage(') && lines[i].includes('imagePath')) {
        inValidate = true;
    }
    if (inValidate) {
        console.log(i + ': ' + lines[i]);
        if (lines[i].includes('module.exports') || (lines[i + 1] && lines[i + 1].includes('exports.'))) {
            if (lines[i].includes('}') || lines[i].includes(';')) inValidate = false;
        }
        if (i > 200) break;
    }
}

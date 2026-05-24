const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const lines = fs.readFileSync(ocrPath, 'utf8').split('\n');
console.log('Total lines:', lines.length);

// Find all validateImage declarations
const vis = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('async function validateImage(imagePath)') || lines[i].includes('exports.validateImage = validateImage')) {
        console.log((i + 1) + ': ' + lines[i]);
    }
}

// Find all tesseract_js_1
const tis = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const tesseract_js_1 = require')) {
        tis.push(i);
        console.log('Tesseract at line', i + 1);
    }
}

// Find fs/promises imports
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('require("fs/promises")') || lines[i].includes("require('fs/promises')")) {
        console.log('fs/promises at line', i + 1, ':', lines[i]);
    }
}

// Show line ranges
console.log('\nLines 1-5:', lines.slice(0, 5).join('\n'));
console.log('\nLines 68-78:', lines.slice(67, 78).join('\n'));
console.log('\nLines 125-140:', lines.slice(124, 140).join('\n'));
console.log('\nLines 182-200:', lines.slice(181, 200).join('\n'));

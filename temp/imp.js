const fs = require('fs');

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');

const i = c.indexOf('var fs = ');
if (i < 0) {
    const j = c.indexOf('const fs = ');
    console.log('const fs at:', j, j >= 0 ? c.substring(j, j + 200) : '');
} else {
    console.log('var fs at:', i, c.substring(i, i + 200));
}

const k = c.indexOf('var path = ');
if (k < 0) {
    const l = c.indexOf('const path = ');
    console.log('const path at:', l, l >= 0 ? c.substring(l, l + 200) : '');
} else {
    console.log('var path at:', k, c.substring(k, k + 200));
}

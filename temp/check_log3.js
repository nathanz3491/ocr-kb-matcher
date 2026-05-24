const fs = require('fs');
try {
    const log = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/backend.log', 'utf8');
    const lines = log.split('\n');
    const recent = lines.slice(-20);
    console.log(recent.join('\n'));
} catch(e) {
    console.log('Error:', e.message);
}
try {
    const log2 = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend.log', 'utf8');
    const lines2 = log2.split('\n');
    const recent2 = lines2.slice(-20);
    console.log(recent2.join('\n'));
} catch(e) {
    console.log('Error2:', e.message);
}

const fs = require('fs');
const c = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js', 'utf8');
const lines = c.split('\n');
let start = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('validateImage')) { start = i; break; }
}
if (start < 0) { console.log('NOT FOUND'); process.exit(1); }
let braceCount = 0;
let inFn = false;
for (let i = start; i < lines.length && i < start + 100; i++) {
    console.log((i + 1) + ': ' + lines[i]);
    const l = lines[i];
    if (l.includes('function') || l.includes('=>')) inFn = true;
    for (const ch of l) { if (ch === '{') braceCount++; if (ch === '}') braceCount--; }
    if (inFn && braceCount === 0 && i > start) break;
}

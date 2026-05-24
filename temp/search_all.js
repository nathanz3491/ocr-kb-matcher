const fs = require('fs');
const path = require('path');

function searchDir(dir, depth) {
    if (depth > 5) return;
    let found = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isFile() && e.name === 'ocr.js') found.push(full);
            else if (e.isDirectory() && !['node_modules', '.git', '.cache'].includes(e.name)) {
                found = found.concat(searchDir(full, depth + 1));
            }
        }
    } catch {}
    return found;
}

const roots = [
    '/home/nathan/ocr-kb-matcher',
    '/home/nathan',
];

for (const r of roots) {
    console.log('Searching:', r);
    const results = searchDir(r, 0);
    for (const f of results) {
        try {
            const s = fs.statSync(f);
            const c = fs.readFileSync(f, 'utf8');
            const hasPatch = c.includes('File accepted by extension check');
            console.log(' ', f, '|', s.size, 'bytes | Modified:', s.mtime, '| Patch:', hasPatch ? 'YES' : 'NO');
        } catch(e) {
            console.log(' ', f, '| ERROR:', e.message);
        }
    }
}

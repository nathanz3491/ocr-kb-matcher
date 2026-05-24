const { execSync } = require('child_process');
const dirs = ['/home/nathan/ocr-kb-matcher/backend/dist', '/home/nathan/ocr-kb-matcher/dist'];
for (const d of dirs) {
    try {
        const r = execSync('find "' + d + '" -name "ocr.js" -type f 2>/dev/null', { encoding: 'utf8', timeout: 10000 });
        if (r.trim()) console.log('LOCATIONS:', r);
    } catch {}
}
try {
    const r = execSync('ls /home/nathan/ocr-kb-matcher/backend/dist/', { encoding: 'utf8', timeout: 5000 });
    console.log('backend/dist/ contents:', r);
} catch(e) { console.log('ls failed:', e.message); }

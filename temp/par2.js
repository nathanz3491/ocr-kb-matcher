const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const NODE = '/home/nathan/.nvm/versions/node/v20.20.2/bin/node';
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const fnStart = c.indexOf('async function validateImage(imagePath) {');
const exportIdx = c.indexOf('exports.validateImage');
let out = 'fnStart=' + fnStart + ' exportIdx=' + exportIdx + '\n';

const newFn = `async function validateImage(imagePath) {
    try {
        const stats = await fs.promises.stat(imagePath);
        if (!stats.isFile()) return { valid: false, error: 'Path is not a file' };
        if (stats.size > 100 * 1024 * 1024) return { valid: false, error: 'File too large (max 100MB)' };
        if (stats.size === 0) return { valid: false, error: 'File is empty' };
        const ext = path.extname(imagePath).toLowerCase();
        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
        console.log('[validateImage] path=' + imagePath + ' ext=' + ext + ' size=' + stats.size);
        if (knownExtensions.includes(ext)) {
            console.log('[validateImage] ACCEPTED ext=' + ext);
            return { valid: true, format: ext.replace('.', '') };
        }
        console.log('[validateImage] REJECTED unknown ext=' + ext);
        return { valid: false, error: 'Invalid image format: ' + ext };
    } catch (error) {
        console.log('[validateImage] ERROR ' + (error.message || error));
        return { valid: false, error: 'Validation error: ' + (error.message || 'unknown') };
    }
}`;

const newFile = c.substring(0, fnStart) + newFn + '\n' + c.substring(exportIdx);
fs.writeFileSync(ocrPath, newFile);
out += 'Patched: oldLen=' + c.length + ' newLen=' + newFile.length + '\n';
fs.writeFileSync('/home/nathan/patch_out.txt', out);

exec('bash -i -c "pm2 restart backend"', (e, restartOut) => {
    let o = fs.readFileSync('/home/nathan/patch_out.txt', 'utf8');
    o += 'Restart: ' + (e ? e.message : restartOut.trim()) + '\n';
    fs.writeFileSync('/home/nathan/patch_out.txt', o);
    setTimeout(() => {
        exec('bash -i -c "pm2 describe backend"', (e2, descOut) => {
            const lines = descOut.split('\n');
            const pidL = (lines.find(l => l.startsWith('│ status')) || '').trim();
            const pidL2 = (lines.find(l => l.includes('uptime')) || '').trim();
            let o = fs.readFileSync('/home/nathan/patch_out.txt', 'utf8');
            o += 'Status: ' + pidL + '\n';
            o += 'Uptime: ' + pidL2 + '\n';
            o += 'DONE\n';
            fs.writeFileSync('/home/nathan/patch_out.txt', o);
        });
    }, 5000);
});

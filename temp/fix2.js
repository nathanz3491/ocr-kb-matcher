const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let log = '';
const origLog = console.log;
console.log = (...a) => { log += a.join(' ') + '\n'; origLog.apply(console, a); };

const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
let c = fs.readFileSync(ocrPath, 'utf8');

const fnStart = c.indexOf('async function validateImage(imagePath) {');
const exportIdx = c.indexOf('exports.validateImage');

log += 'fnStart: ' + fnStart + ' exportIdx: ' + exportIdx + '\n';

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
log += 'Patched! Old len: ' + c.length + ' New len: ' + newFile.length + '\n';

exec('pm2 restart backend', (e, out, err) => {
    log += 'Restart out: ' + out.trim() + '\n';
    if (e) { log += 'Restart error: ' + e.message + '\n'; fs.writeFileSync('/home/nathan/fix_log.txt', log); return; }
    setTimeout(() => {
        exec('pm2 describe backend', (e2, out2) => {
            const lines = out2.split('\n');
            const pidLine = lines.find(l => l.includes('pid')) || '';
            const statusLine = lines.find(l => l.includes('status')) || '';
            log += 'PID: ' + pidLine.trim() + '\n';
            log += 'Status: ' + statusLine.trim() + '\n';
            fs.writeFileSync('/home/nathan/fix_log.txt', log);
        });
    }, 4000);
});

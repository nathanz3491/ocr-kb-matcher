const fs = require('fs');
const path = require('path');

const dataDir = '/home/nathan/ocr-kb-matcher/backend/data';
let files = [];
try {
    files = fs.readdirSync(dataDir);
} catch(e) {
    console.log('data dir error:', e.message);
}

const jobFiles = files.filter(f => f.includes('job'));
console.log('Job files:', jobFiles.slice(0, 5));

for (const f of jobFiles.slice(0, 3)) {
    try {
        const content = fs.readFileSync(path.join(dataDir, f), 'utf8');
        const jobs = JSON.parse(content);
        const arr = Array.isArray(jobs) ? jobs : Object.values(jobs);
        const recent = arr.slice(-3);
        for (const j of recent) {
            if (j.fileName && j.fileName.includes('png')) {
                console.log('\nPNG job found:', JSON.stringify(j, null, 2));
            }
        }
    } catch(e) {}
}

const uploadsDir = '/home/nathan/ocr-kb-matcher/backend/uploads';
let uploads = [];
try {
    uploads = fs.readdirSync(uploadsDir);
} catch(e) {
    console.log('uploads dir error:', e.message);
}

const pngFiles = uploads.filter(f => f.endsWith('.png'));
console.log('\nPNG files in uploads:', pngFiles.slice(-5));

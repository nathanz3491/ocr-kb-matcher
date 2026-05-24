const { execSync } = require('child_process');
const fs = require('fs');

const log = fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/backend.log', 'utf8');
const lines = log.split('\n').filter(l => l.includes('png') || l.includes('PNG') || l.includes('validate') || l.includes('upload') || l.includes('7002'));
console.log(lines.slice(-20).join('\n'));

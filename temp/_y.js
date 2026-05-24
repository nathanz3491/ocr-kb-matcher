const fs=require('fs');
const f='/home/nathan/ocr-kb-matcher/backend/uploads/73cb3dd8-3fe1-4ec2-b415-20a5848a2e81-1777992082674-nxw0ru.png';
const b=fs.readFileSync(f);
console.log('size:',b.length,'header:',b.slice(0,8).toString('hex'));

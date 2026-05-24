const fs=require('fs');
const b=fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/uploads/1ebfc001-125c-46bc-970d-37e9c12d0cf1-1778035846789-pype87.png');
console.log('size:',b.length,'header:',b.slice(0,8).toString('hex'));

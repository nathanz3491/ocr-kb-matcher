const fs = require('fs');
const files = ['/home/nathan/patch_ocr.js', '/home/nathan/patch_ocr2.js', '/home/nathan/patch_ocr3.js', '/home/nathan/patch_final.js', '/home/nathan/check_patch.js', '/home/nathan/verify_patch.js', '/home/nathan/verify2.js', '/home/nathan/diag.js', '/home/nathan/check_patch.js', '/home/nathan/check_log.js', '/home/nathan/check_log2.js', '/home/nathan/check_log3.js', '/home/nathan/find_ocr.js', '/home/nathan/find_ocr2.js'];
for (const f of files) {
    try { fs.unlinkSync(f); console.log('deleted', f); } catch(e) {}
}

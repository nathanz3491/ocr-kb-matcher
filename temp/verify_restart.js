const { execSync } = require('child_process');
const exec = (cmd) => {
    try { return execSync(cmd, { encoding: 'utf8', timeout: 10000 }); }
    catch (e) { return e.stdout ? e.stdout.toString() : e.message; }
};

const nodeBin = '/home/nathan/.nvm/versions/node/v20.20.2/bin/node';

// Check what PM2 thinks it's running
console.log('PM2 jlist (JSON):');
const jlist = exec('pm2 jlist');
try {
    const processes = JSON.parse(jlist);
    for (const p of processes) {
        console.log('Name:', p.name, '| PID:', p.pid, '| Monit:', p.monit, '| Script:', p.pm_exec_path, '| CWD:', p.pm_cwd);
        console.log('  Cmd:', p.pm2_env?.NODE_MAIN_APP_PATH || p.pm_cwd || '?');
    }
} catch(e) {
    console.log('Parse error:', e.message);
    console.log(jlist.toString().substring(0, 500));
}

// Verify the file being used
const fs = require('fs');
const ocrPath = '/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/ocr.js';
const c = fs.readFileSync(ocrPath, 'utf8');
console.log('\nPatched ocr.js has extension return:', c.includes('return { valid: true, format: ext.replace'));

console.log('\n=== RESTARTING PM2 ===');
try { execSync('pm2 stop backend', { encoding: 'utf8', timeout: 10000 }); } catch(e) {}
try { execSync('sleep 2', { encoding: 'utf8', timeout: 5000 }); } catch(e) {}
try { execSync('pm2 delete backend', { encoding: 'utf8', timeout: 5000 }); } catch(e) {}
try { execSync('pm2 start /home/nathan/ocr-kb-matcher/backend/dist/backend/src/index.js --name backend --cwd /home/nathan/ocr-kb-matcher/backend --interpreter ' + nodeBin, { encoding: 'utf8', timeout: 15000 }); } catch(e) {}

console.log('\nPM2 status after restart:');
console.log(exec('pm2 list'));

const fs = require('fs');
try {
    const log = fs.readFileSync('/home/nathan/.pm2/logs/backend-out-0.log', 'utf8');
    const lines = log.split('\n');
    const recent = lines.slice(-30);
    console.log(recent.join('\n'));
} catch(e) {
    console.log('Error reading log:', e.message);
}

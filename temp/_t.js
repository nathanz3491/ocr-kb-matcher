const http = require('http');
const body = JSON.stringify({ email: 'test@example.com', password: 'testpass123', name: 'Test User' });
const req = http.request({ hostname: 'localhost', port: 3001, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => { console.log('Status:', res.statusCode); console.log('Body:', data); process.exit(0); });
});
req.on('error', e => { console.error(e.message); process.exit(1); });
req.write(body);
req.end();

const http = require('http');

function apiReq(method, path, body) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'localhost', port: 3001, path, method, headers: { 'Content-Type': 'application/json' } };
        const r = http.request(opts, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

async function run() {
    const reg = await apiReq('POST', '/api/auth/register', { email: 'test@example.com', password: 'testpass123', name: 'Test User' });
    console.log('Register:', reg.status, JSON.stringify(reg.body));

    const login = await apiReq('POST', '/api/auth/login', { email: 'test@example.com', password: 'testpass123' });
    console.log('Login:', login.status, JSON.stringify(login.body));

    if (login.body && login.body.token) {
        const token = login.body.token;
        console.log('\nTOKEN:', token);
    }
    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });

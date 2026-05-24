const http = require('http');
const fs = require('fs');
const path = require('path');

function api(method, urlPath, options = {}) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'localhost', port: 3001,
            path: urlPath, method,
            headers: options.headers || {},
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

function buildMultipart(files) {
    const boundary = '----Test' + Date.now();
    let headerPart = '';
    for (const [k, filePath] of Object.entries(files)) {
        const filename = path.basename(filePath);
        const mime = filename.endsWith('.png') ? 'image/png' : 'application/octet-stream';
        headerPart += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`;
    }
    const prefix = Buffer.from(headerPart, 'utf8');
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const fileBufs = Object.values(files).map(f => fs.readFileSync(f));
    return { boundary, buffer: Buffer.concat([prefix, ...fileBufs, suffix]) };
}

async function uploadFile(label, filePath, token) {
    console.log(`\n=== ${label} ===`);
    const { boundary, buffer } = buildMultipart({ file: filePath });
    const headers = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': buffer.length,
        'Authorization': `Bearer ${token}`
    };
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 3001, method: 'POST',
            path: '/api/upload',
            headers
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`Status: ${res.statusCode}`);
                    console.log(`Response:`, JSON.stringify(json, null, 2));
                    resolve({ status: res.statusCode, body: json });
                } catch(e) {
                    console.log(`Raw: ${data.slice(0, 500)}`);
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        req.write(buffer);
        req.end();
    });
}

async function waitForJob(jobId, token, maxWait = 180000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const res = await api('GET', `/api/jobs/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log(`  [${Math.round((Date.now() - start)/1000)}s] Status: ${res.body.status || 'unknown'}`);
        if (res.body.status === 'completed') return res.body;
        if (res.body.status === 'failed') return res.body;
        await new Promise(r => setTimeout(r, 5000));
    }
    return null;
}

async function run() {
    const loginBody = JSON.stringify({ email: 'test@example.com', password: 'testpass123' });
    const login = await api('POST', '/api/auth/login', {
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
        body: loginBody
    });
    console.log('Login:', login.status, login.body.success || login.body.error || '');

    if (!login.body.data || !login.body.data.accessToken) { console.error('No token!', JSON.stringify(login.body)); process.exit(1); }
    const token = login.body.data.accessToken;

    const pngPath = '/tmp/test.png';
    fs.writeFileSync(pngPath, Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
    ]));

    const pngResult = await uploadFile('PNG Upload (1x1 pixel)', pngPath, token);
    if (pngResult.body && pngResult.body.jobId) {
        const jobResult = await waitForJob(pngResult.body.jobId, token);
        console.log('Job result:', JSON.stringify(jobResult, null, 2));
    } else {
        console.log('Upload failed:', JSON.stringify(pngResult.body));
    }

    const urlBody = JSON.stringify({ url: 'https://httpbin.org/html' });
    const urlResult = await api('POST', '/api/upload/url', {
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(urlBody), 'Authorization': `Bearer ${token}` },
        body: urlBody
    });
    console.log('\nURL Import Status:', urlResult.status);
    console.log('URL Import Response:', JSON.stringify(urlResult.body, null, 2));
    if (urlResult.body && urlResult.body.jobId) {
        const urlJobResult = await waitForJob(urlResult.body.jobId, token);
        console.log('URL Job result:', JSON.stringify(urlJobResult, null, 2));
    }

    const jobs = await api('GET', '/api/jobs', { headers: { 'Authorization': `Bearer ${token}` } });
    console.log('\nJobs list:', jobs.status, JSON.stringify(jobs.body, null, 2));

    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3001/api';

async function api(method, urlPath, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE);
        const req = http.request({
            hostname: 'localhost', port: 3001,
            path: url.pathname + url.search, method,
            headers: options.headers || {},
        }, (res) => {
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
    let body = '';
    for (const [k, filePath] of Object.entries(files)) {
        const filename = path.basename(filePath);
        const content = fs.readFileSync(filePath);
        const mime = filename.endsWith('.png') ? 'image/png' : 'application/octet-stream';
        body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`;
    }
    const prefix = Buffer.from(body, 'utf8');
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const fileBufs = Object.values(files).map(f => fs.readFileSync(f));
    return { boundary, buffer: Buffer.concat([prefix, ...fileBufs, suffix]) };
}

async function uploadFile(label, filePath) {
    console.log(`\n=== ${label} ===`);
    const { boundary, buffer } = buildMultipart({ file: filePath });
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 3001, method: 'POST',
            path: '/api/upload',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': buffer.length }
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

async function waitForJob(jobId, maxWait = 120000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const res = await api('GET', `/api/jobs/${jobId}`);
        console.log(`  Status: ${res.body.status} (${Math.round((Date.now() - start)/1000)}s)`);
        if (res.body.status === 'completed' || res.body.status === 'failed') return res.body;
        await new Promise(r => setTimeout(r, 3000));
    }
    return null;
}

async function run() {
    console.log('=== Import Flow Tests ===');
    const health = await api('GET', '/api/health');
    console.log('Health:', JSON.stringify(health.body));

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

    const pngResult = await uploadFile('PNG Upload', pngPath);
    if (pngResult.body && pngResult.body.jobId) {
        const jobResult = await waitForJob(pngResult.body.jobId);
        console.log('Job result:', JSON.stringify(jobResult, null, 2));
    }

    const urlBody = JSON.stringify({ url: 'https://httpbin.org/html' });
    const urlResult = await api('POST', '/api/upload/url', {
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(urlBody) },
        body: urlBody
    });
    console.log('\nURL Import:', urlResult.status, JSON.stringify(urlResult.body, null, 2));

    const jobs = await api('GET', '/api/jobs');
    console.log('\nJobs list:', jobs.status, JSON.stringify(jobs.body, null, 2));

    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

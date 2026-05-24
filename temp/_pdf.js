const http = require('http');
const fs = require('fs');

function api(method, urlPath, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 3001, path: urlPath, method,
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

async function uploadFile(label, filePath, token) {
    const boundary = 'Test' + Date.now();
    const mime = filePath.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filePath.split('/').pop()}"\r\nContent-Type: ${mime}\r\n\r\n`;
    const prefix = Buffer.from(headerPart, 'utf8');
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const buf = Buffer.concat([prefix, fs.readFileSync(filePath), suffix]);

    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 3001, method: 'POST', path: '/api/upload',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': buf.length, 'Authorization': `Bearer ${token}` }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.write(buf);
        req.end();
    });
}

async function waitForJob(jobId, token, maxWait = 180000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const res = await api('GET', `/api/jobs/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log(`  [${Math.round((Date.now() - start)/1000)}s] ${res.body.data ? res.body.data.status : res.body.error}`);
        if (res.body.data && (res.body.data.status === 'completed' || res.body.data.status === 'failed')) return res.body;
        await new Promise(r => setTimeout(r, 5000));
    }
    return null;
}

async function run() {
    const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4Y2MzM2JkNS05NzU3LTQwNjEtYWViOC03YzhhM2VhMjc3N2MiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJhY2NvdW50VHlwZSI6InN0dWRlbnQiLCJpYXQiOjE3Nzc5OTE5MDcsImV4cCI6MTc3ODU5NjcwN30.4-jo7zjfplf0P8pR7eMEWVVl15F2w56_cbjtyS5BSFU';

    const pdfPath = '/tmp/test.pdf';
    const pdfHeader = Buffer.from('%PDF-1.4\n');
    const pdfBody = Buffer.from('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>/Contents 4 0 R>>endobj 4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Hello World from PDF!) Tj ET\nendstream endobj xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000317 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n418\n%%EOF\n');
    fs.writeFileSync(pdfPath, Buffer.concat([pdfHeader, pdfBody]));
    console.log('PDF created:', fs.statSync(pdfPath).size, 'bytes');

    const pdfResult = await uploadFile('PDF Upload', pdfPath, TOKEN);
    console.log('PDF Upload:', pdfResult.status, JSON.stringify(pdfResult.body.data || pdfResult.body, null, 2));

    if (pdfResult.body && pdfResult.body.data && pdfResult.body.data.jobId) {
        const jobResult = await waitForJob(pdfResult.body.data.jobId, TOKEN);
        console.log('PDF Job result:', JSON.stringify(jobResult, null, 2));
    }

    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });

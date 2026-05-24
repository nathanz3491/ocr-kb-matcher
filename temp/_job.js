const http = require('http');
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4Y2MzM2JkNS05NzU3LTQwNjEtYWViOC03YzhhM2VhMjc3N2MiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJhY2NvdW50VHlwZSI6InN0dWRlbnQiLCJpYXQiOjE3Nzc5OTE5MDcsImV4cCI6MTc3ODU5NjcwN30.4-jo7zjfplf0P8pR7eMEWVVl15F2w56_cbjtyS5BSFU';
const JOB_ID = '64e61085-4a71-41c3-9e01-2092b9411389';

const req = http.request({
    hostname: 'localhost', port: 3001,
    path: `/api/jobs/${JOB_ID}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${TOKEN}` }
}, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json.data || json, null, 2));
        } catch(e) { console.log(data); }
    });
});
req.on('error', e => console.error(e.message));
req.end();

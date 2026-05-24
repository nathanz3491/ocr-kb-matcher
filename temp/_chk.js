const http = require('http');
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4Y2MzM2JkNS05NzU3LTQwNjEtYWViOC03YzhhM2VhMjc3N2MiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJhY2NvdW50VHlwZSI6InN0dWRlbnQiLCJpYXQiOjE3Nzc5OTE5MDcsImV4cCI6MTc3ODU5NjcwN30.4-jo7zjfplf0P8pR7eMEWVVl15F2w56_cbjtyS5BSFU';

const jobs = [
    'd6560311-b00a-4b1a-94ac-cd8b28c8c155',
    '682011fe-21c7-42a4-8566-ffa41add9c43'
];

for (const jobId of jobs) {
    const req = http.request({
        hostname: 'localhost', port: 3001,
        path: `/api/jobs/${jobId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`Job ${jobId.slice(0,8)}:`);
                console.log(`  status: ${json.data ? json.data.status : json.error}`);
                if (json.data) {
                    console.log(`  currentStep: ${json.data.currentStep}`);
                    console.log(`  ocrText: "${json.data.ocrText ? json.data.ocrText.slice(0, 100) : ''}"`);
                    console.log(`  error: ${json.data.error || 'none'}`);
                }
            } catch(e) { console.log(`Error parsing: ${data}`); }
        });
    });
    req.on('error', e => console.error(e.message));
    req.end();
}

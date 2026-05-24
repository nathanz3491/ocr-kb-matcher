const http = require('http');

const body = JSON.stringify({
  email: 'testuser99@dev.local',
  password: 'password123',
  name: 'Test User'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('Body:', data);
  });
});

req.on('error', e => console.error('Error:', e));
req.write(body);
req.end();

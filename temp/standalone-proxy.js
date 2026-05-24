const http = require('http');
const url = require('url');

const FRONTEND = { host: '127.0.0.1', port: 3000 };
const BACKEND = { host: '127.0.0.1', port: 3001 };

function proxyRequest(req, res, target) {
  const options = {
    hostname: target.host,
    port: target.port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Proxy error');
    }
  });

  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;

  if (pathname.startsWith('/api/')) {
    proxyRequest(req, res, BACKEND);
  } else {
    proxyRequest(req, res, FRONTEND);
  }
}).on('error', (err) => {
  console.error('Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error('Port 8000 is in use. Run: fuser -k 8000/tcp');
  }
  process.exit(1);
}).listen(8181, '0.0.0.0', () => {
  console.log('Proxy listening on :8181');
  console.log('  /api/* -> backend :3001');
  console.log('  *      -> frontend :3000');
});

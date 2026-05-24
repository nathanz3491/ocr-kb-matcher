
const http = require('http');
const net = require('net');
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
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Proxy error');
    }
  });
  req.pipe(proxyReq);
}

const srv = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  if (pathname.startsWith('/api/')) {
    proxyRequest(req, res, BACKEND);
  } else {
    proxyRequest(req, res, FRONTEND);
  }
});

srv.on('error', (err) => {
  console.error('Error:', err.message, err.code);
});

srv.listen(9000, '0.0.0.0', () => {
  console.log('Listening on 9000');
  setTimeout(() => srv.close(), 2000);
});

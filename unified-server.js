const http = require('http');
const fs = require('fs');
const path = require('path');

const PROXY_PORT = 8080;
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 3001;
const FRONTEND_HOST = '127.0.0.1';
const FRONTEND_PORT = 3000;
const FRONTEND_BUILD = path.join(__dirname, 'frontend', '.next');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function proxyRequest(req, res, targetHost, targetPort) {
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers },
  };
  delete options.headers['host'];
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Origin unavailable: ' + targetHost + ':' + targetPort);
  });
  req.pipe(proxyReq);
}

function serveStatic(req, res) {
  let url = req.url.split('?')[0];
  if (!url.startsWith('/_next/') && !url.startsWith('/favicon') && !url.endsWith('.ico') && !url.endsWith('.svg')) {
    res.writeHead(404, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  const staticPath = url.startsWith('/_next/')
    ? path.join(FRONTEND_BUILD, url.substring('/_next/'.length))
    : path.join(FRONTEND_BUILD, '..', url);
  try {
    const stat = fs.statSync(staticPath);
    if (!stat.isFile()) {
      res.writeHead(404, { 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
    const ext = path.extname(staticPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' });
    fs.createReadStream(staticPath).pipe(res);
  } catch (err) {
    res.writeHead(404, { 'Cache-Control': 'no-store' });
    res.end();
  }
}

const server = http.createServer((req, res) => {
  const url = req.url || '';

  if (url.startsWith('/_next/')) {
    serveStatic(req, res);
  } else if (url.startsWith('/api/')) {
    proxyRequest(req, res, BACKEND_HOST, BACKEND_PORT);
  } else {
    proxyRequest(req, res, FRONTEND_HOST, FRONTEND_PORT);
  }
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log('Unified server running on port ' + PROXY_PORT);
  console.log('Frontend: ' + FRONTEND_HOST + ':' + FRONTEND_PORT);
  console.log('Backend: ' + BACKEND_HOST + ':' + BACKEND_PORT);
});

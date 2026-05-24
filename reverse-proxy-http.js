const http = require('http');
const net = require('net');

const PROXY_PORT = 8080;
const FRONTEND_HOST = '127.0.0.1';
const FRONTEND_PORT = 3000;
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 3001;

function proxyRequest(req, res, targetHost, targetPort) {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers };
    delete headers['host'];
    if (body.length > 0) {
      headers['content-length'] = body.length.toString();
    }

    const options = {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Origin unavailable: ' + targetHost + ':' + targetPort);
      }
    });

    if (body.length > 0) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  const parsed = require('url').parse(req.url);
  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname.startsWith('/api/') || pathname.startsWith('/socket.io/') || pathname.startsWith('/ws/')) {
    proxyRequest(req, res, BACKEND_HOST, BACKEND_PORT);
  } else {
    proxyRequest(req, res, FRONTEND_HOST, FRONTEND_PORT);
  }
});

server.on('upgrade', (req, clientSocket, head) => {
  const parsed = require('url').parse(req.url);
  const pathname = decodeURIComponent(parsed.pathname);
  const isBackend = pathname.startsWith('/socket.io/') || pathname.startsWith('/ws/');
  const targetHost = isBackend ? BACKEND_HOST : FRONTEND_HOST;
  const targetPort = isBackend ? BACKEND_PORT : FRONTEND_PORT;

  const serverSocket = net.connect(targetPort, targetHost, () => {
    clientSocket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      '\r\n'
    );
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (e) => {
    console.error('WebSocket proxy error:', e.message);
    clientSocket.destroy();
  });

  clientSocket.on('error', () => {
    serverSocket.destroy();
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PROXY_PORT + ' is in use.');
  }
  console.error('Server error:', err.message);
  process.exit(1);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log('HTTP proxy running on port ' + PROXY_PORT);
  console.log('  /api/* -> backend :' + BACKEND_PORT);
  console.log('  /ws/*  -> backend :' + BACKEND_PORT + ' (WebSocket)');
  console.log('  *      -> frontend :' + FRONTEND_PORT);
});

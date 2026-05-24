const ws = require('/home/nathan/ocr-kb-matcher/backend/node_modules/ws');
console.log('ws version:', ws.WebSocket ? 'available' : 'missing');
const http = require('http');

const PROXY_PORT = 8080;
const FRONTEND_HOST = '127.0.0.1';
const FRONTEND_PORT = 3000;
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 3001;

function proxyRequest(req, res, targetHost, targetPort) {
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: Object.assign({}, req.headers),
  };
  delete options.headers['host'];
  const proxyReq = http.request(options, function(proxyRes) {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', function(e) {
    if (!res.headersSent) {
      res.writeHead(502, {'Content-Type': 'text/plain'});
      res.end('Origin unavailable: ' + targetHost + ':' + targetPort);
    }
  });
  req.pipe(proxyReq);
}

const server = http.createServer(function(req, res) {
  const parsed = require('url').parse(req.url);
  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname.startsWith('/api/')) {
    proxyRequest(req, res, BACKEND_HOST, BACKEND_PORT);
  } else {
    proxyRequest(req, res, FRONTEND_HOST, FRONTEND_PORT);
  }
});

// WebSocket proxy using ws library - proper WebSocket-aware proxying
server.on('upgrade', function(req, clientSocket, head) {
  const parsed = require('url').parse(req.url);
  const pathname = decodeURIComponent(parsed.pathname);

  // Route /ws/* to backend
  if (pathname.startsWith('/ws/')) {
    const targetUrl = 'ws://' + BACKEND_HOST + ':' + BACKEND_PORT + pathname;
    const wsProxy = new ws.WebSocket({ target: targetUrl, ws: {} });

    wsProxy.on('error', function(e) {
      console.error('WebSocket proxy error:', e.message);
      clientSocket.destroy();
    });

    clientSocket.on('error', function() {
      wsProxy.terminate();
    });

    wsProxy.on('open', function() {
      if (head && head.length > 0) {
        wsProxy.stream.write(head);
      }
      wsProxy.on('message', function(data, isBinary) {
        if (clientSocket.writable) {
          clientSocket.write(data);
        }
      });
      clientSocket.on('data', function(chunk) {
        if (wsProxy.readyState === ws.WebSocket.OPEN) {
          wsProxy.send(chunk, { binary: isBinary || true });
        }
      });
      clientSocket.on('close', function() {
        wsProxy.close();
      });
      wsProxy.on('close', function() {
        clientSocket.destroy();
      });
    });
  } else {
    clientSocket.destroy();
  }
});

server.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PROXY_PORT + ' is in use.');
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

server.listen(PROXY_PORT, '0.0.0.0', function() {
  console.log('HTTP proxy running on port ' + PROXY_PORT);
  console.log('  /api/* -> backend :' + BACKEND_PORT);
  console.log('  /ws/*  -> backend :' + BACKEND_PORT + ' (WebSocket)');
  console.log('  *      -> frontend :' + FRONTEND_PORT);
});

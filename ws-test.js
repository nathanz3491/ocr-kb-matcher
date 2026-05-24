const net = require('net');
const client = new net.Socket();
client.connect(8080, '127.0.0.1', function() {
  console.log('Connected to port 8080');
  client.write('GET /ws/game HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n');
});
client.on('data', function(data) {
  console.log('Response:');
  console.log(data.toString('utf8').substring(0, 300));
  client.destroy();
  process.exit(0);
});
client.on('error', function(e) {
  console.log('Socket error: ' + e.message);
  process.exit(1);
});
setTimeout(function() {
  console.log('Timeout - no response');
  client.destroy();
  process.exit(1);
}, 5000);

const { io } = require('/home/nathan/ocr-kb-matcher/backend/node_modules/socket.io-client');
const client = io('http://localhost:3001/ws/game', {
  transports: ['websocket'],
  timeout: 5000,
  reconnection: false
});
client.on('connect', function() {
  console.log('CONNECTED! SID:', client.id);
  client.emit('room:create', { hostId: 'test-host-123' }, function(ack) {
    console.log('Room create ack:', JSON.stringify(ack));
    client.disconnect();
    process.exit(0);
  });
});
client.on('connect_error', function(e) {
  console.log('CONNECT ERROR:', e.message);
  process.exit(1);
});
client.on('error', function(e) {
  console.log('ERROR:', e.message);
});
setTimeout(function() {
  console.log('TIMEOUT - no connection');
  client.disconnect();
  process.exit(1);
}, 8000);

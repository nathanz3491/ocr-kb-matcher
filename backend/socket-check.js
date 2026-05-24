const { Server } = require('/home/nathan/ocr-kb-matcher/backend/node_modules/socket.io');
const io = new Server(3001, { path: '/ws/game' });
console.log('Socket.IO test server created - backend game gateway check');
setTimeout(function() {
  io.close();
  process.exit(0);
}, 2000);

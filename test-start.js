
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
console.log('Starting...');
try {
  require('./backend/dist/backend/src/index.js');
  console.log('Required OK');
} catch(e) {
  console.log('Require failed:', e.code, e.message);
  process.exit(1);
}
console.log('Done');

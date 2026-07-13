const fs = require('fs');

const USER_PROGRESS = 'C:/Users/64887/ocr-kb-matcher/backend/data/user-progress.json';
const data = JSON.parse(fs.readFileSync(USER_PROGRESS, 'utf-8'));

console.log('Before dedup:');
console.log('  knownNodes:', data.knownNodes.length, 'entries');
console.log('  learnedAt:', Object.keys(data.learnedAt).length, 'keys');
console.log('  nodeMastery:', Object.keys(data.nodeMastery).length, 'keys');

data.knownNodes = [...new Set(data.knownNodes)];

function mergeKeepLast(obj) {
  const entries = Object.entries(obj);
  const seen = new Map();
  for (const [k, v] of entries) {
    seen.set(k, v);
  }
  return Object.fromEntries(seen);
}
data.learnedAt = mergeKeepLast(data.learnedAt);
data.nodeMastery = mergeKeepLast(data.nodeMastery);

data.knownNodes = data.knownNodes.filter(id => !data.unknownNodes.includes(id));
data.unknownNodes = [...new Set(data.unknownNodes)];

console.log('After dedup:');
console.log('  knownNodes:', data.knownNodes.length, 'entries ->', data.knownNodes.join(','));
console.log('  learnedAt:', Object.keys(data.learnedAt).length, 'keys');
console.log('  nodeMastery:', Object.keys(data.nodeMastery).length, 'keys');

fs.writeFileSync(USER_PROGRESS, JSON.stringify(data, null, 2), 'utf-8');
console.log('Wrote', USER_PROGRESS);
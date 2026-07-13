const fs = require('fs');
const g = JSON.parse(fs.readFileSync('C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json', 'utf-8'));
const byDomain = {};
for (const k of Object.keys(g.nodes)) {
  const m = k.match(/^(EA|SA|SEA|CA)-([A-Z]{2})/);
  if (m) {
    const d = m[1] + '-' + m[2];
    byDomain[d] = (byDomain[d] || 0) + 1;
  } else {
    byDomain['other-' + k] = 1;
  }
}
console.log('Local node counts by domain:');
for (const [k, v] of Object.entries(byDomain).sort()) {
  console.log('  ' + k + ': ' + v);
}
console.log('Total:', Object.keys(g.nodes).length);
console.log('All new nodes present:');
['EA-JP-029', 'EA-JP-031', 'EA-JP-032', 'EA-JP-033', 'EA-CH-051', 'EA-KR-001', 'EA-KR-002', 'EA-KR-003', 'EA-KR-004', 'EA-KR-006', 'EA-KR-008', 'EA-KR-013'].forEach(id => {
  console.log('  ' + id + ': ' + (g.nodes[id] ? 'YES' : 'MISSING'));
});
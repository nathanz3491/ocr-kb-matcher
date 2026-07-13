const fs = require('fs');
const g = JSON.parse(fs.readFileSync('C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json', 'utf-8'));
const u1 = g.nodes['EA-CH-001'];
const meiji = g.nodes['EA-JP-029'];
console.log('EA-CH-001:', u1?.name, 'unit=' + u1?.unit, 'pos=(' + u1?.x + ',' + u1?.y + ')');
console.log('EA-JP-029:', meiji?.name, 'unit=' + meiji?.unit, 'pos=(' + meiji?.x + ',' + meiji?.y + ')');
const byUnit = {};
for (const k of Object.keys(g.nodes)) {
  const m = k.match(/^EA-([A-Z]{2})/);
  if (m) {
    const u = g.nodes[k].unit || 'NO_UNIT';
    byUnit[u] = (byUnit[u] || 0) + 1;
  }
}
console.log('By unit:', JSON.stringify(byUnit));
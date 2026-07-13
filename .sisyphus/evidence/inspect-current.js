const fs = require('fs');
const g = JSON.parse(fs.readFileSync('C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json', 'utf-8'));

console.log('Total nodes:', Object.keys(g.nodes).length);
console.log('Total edges:', Object.keys(g.edges).length);

const sample = [];
for (const k of Object.keys(g.nodes).slice(0, 8)) {
  const n = g.nodes[k];
  sample.push({
    id: n.id,
    name: n.name,
    x: n.x,
    y: n.y,
    unit: n.unit,
    domain: n.domain,
    position: n.position
  });
}
console.log('First 8 nodes:');
console.log(JSON.stringify(sample, null, 2));
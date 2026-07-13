const fs = require('fs');
const path = 'C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf-8'));

const atOrigin = [];
const proper = [];
for (const [id, n] of Object.entries(g.nodes)) {
  if (n.x === 0 && n.y === 0) {
    atOrigin.push({ id, name: n.name, domain: n.domain, unit: n.unit });
  } else {
    proper.push({ id, name: n.name, x: n.x, y: n.y, unit: n.unit });
  }
}
console.log('Nodes at (0,0) - likely orphan slug data: ' + atOrigin.length);
for (const n of atOrigin) console.log('  ' + n.id + ' | ' + n.name + ' | unit=' + n.unit + ' | domain=' + n.domain);
console.log('');
console.log('Nodes with proper positions: ' + proper.length);
for (const n of proper.slice(0, 12)) console.log('  ' + n.id + ' | ' + n.name + ' | x=' + n.x + ',y=' + n.y + ' | unit=' + n.unit);
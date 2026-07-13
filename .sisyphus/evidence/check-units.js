const fs = require('fs');
const path = 'C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf-8'));

// Group nodes by their declared unit (from `unit` field or from `domain` pattern)
const byUnit = { U1: [], U2: [], U3: [], U4: [], U5: [], U6: [], U7: [], U8: [] };
const noUnit = [];

for (const [id, n] of Object.entries(g.nodes)) {
  const u = n.unit;
  if (u && byUnit[u]) {
    byUnit[u].push({ id, name: n.name, x: n.x, y: n.y });
  } else {
    noUnit.push({ id, name: n.name, x: n.x, y: n.y, domain: n.domain });
  }
}

console.log('=== Nodes by declared unit ===');
for (const u of Object.keys(byUnit)) {
  console.log('  ' + u + ': ' + byUnit[u].length + ' nodes');
  for (const n of byUnit[u]) console.log('    ' + n.id + ' | ' + n.name.substring(0, 50) + ' | x=' + n.x + ',y=' + n.y);
}

console.log('');
console.log('=== Nodes WITHOUT unit field (' + noUnit.length + ') ===');
for (const n of noUnit) console.log('  ' + n.id + ' | ' + n.name + ' | x=' + n.x + ',y=' + n.y + ' | domain=' + n.domain);
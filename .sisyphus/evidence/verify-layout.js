const fs = require('fs');
const g = JSON.parse(fs.readFileSync('C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json', 'utf-8'));

const byUnit = {};
for (const [id, n] of Object.entries(g.nodes)) {
  const u = n.unit || 'NO_UNIT';
  if (!byUnit[u]) byUnit[u] = [];
  byUnit[u].push({ id, name: n.name, x: n.x, y: n.y });
}

for (const u of Object.keys(byUnit).sort()) {
  const nodes = byUnit[u];
  if (u === 'NO_UNIT') {
    console.log('=== NO_UNIT (' + nodes.length + ' nodes) ===');
    for (const n of nodes) console.log('  ' + n.id + ' | ' + n.name + ' | x=' + n.x + ',y=' + n.y);
    continue;
  }
  if (nodes.length === 0) continue;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  console.log('U' + u.replace('U', '') + ' | ' + nodes.length + ' nodes | x: ' + xMin + '-' + xMax + ' | y: ' + yMin + '-' + yMax);
}

console.log('');
console.log('=== Verify U1 rectangular layout ===');
const u1 = byUnit['U1'] || [];
console.log('U1 has ' + u1.length + ' nodes');
const cols = {};
for (const n of u1) {
  const col = Math.floor(n.x / 500) * 500;
  if (!cols[col]) cols[col] = 0;
  cols[col]++;
}
console.log('Nodes by x-column (500px buckets):');
for (const k of Object.keys(cols).sort((a, b) => a - b)) {
  console.log('  x=' + k + ': ' + cols[k] + ' nodes');
}
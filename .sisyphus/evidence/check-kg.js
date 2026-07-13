const fs = require('fs');
const g = JSON.parse(fs.readFileSync('/home/nathan/ocr-kb-matcher/backend/data/knowledge-graph.json', 'utf-8'));
const counts = {};
for (const k of Object.keys(g.nodes)) {
  const m = k.match(/^EA-([A-Z]{2})/);
  if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
}
console.log('Domain counts:', JSON.stringify(counts));
console.log('Total nodes:', Object.keys(g.nodes).length);
console.log('EA-JP-029:', g.nodes['EA-JP-029'] ? g.nodes['EA-JP-029'].name : 'MISSING');
console.log('EA-JP-031:', g.nodes['EA-JP-031'] ? g.nodes['EA-JP-031'].name : 'MISSING');
console.log('EA-JP-032:', g.nodes['EA-JP-032'] ? g.nodes['EA-JP-032'].name : 'MISSING');
console.log('EA-JP-033:', g.nodes['EA-JP-033'] ? g.nodes['EA-JP-033'].name : 'MISSING');
console.log('EA-CH-051:', g.nodes['EA-CH-051'] ? g.nodes['EA-CH-051'].name : 'MISSING');
console.log('EA-KR-001:', g.nodes['EA-KR-001'] ? g.nodes['EA-KR-001'].name : 'MISSING');
console.log('EA-KR-006:', g.nodes['EA-KR-006'] ? g.nodes['EA-KR-006'].name : 'MISSING');
console.log('EA-KR-008:', g.nodes['EA-KR-008'] ? g.nodes['EA-KR-008'].name : 'MISSING');
console.log('EA-KR-013:', g.nodes['EA-KR-013'] ? g.nodes['EA-KR-013'].name : 'MISSING');
console.log('---');
console.log('Slug nodes still present?');
const slugs = ['eastern-zhou-period', 'warring-states', 'inter-state-warfare'];
for (const s of slugs) console.log('  ' + s + ':', g.nodes[s] ? 'STILL THERE' : 'GONE');
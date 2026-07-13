const fs = require('fs');
const path = 'C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf-8'));

const before = Object.keys(g.nodes).length;
const beforeEdges = Object.keys(g.edges).length;

const SLUG_NODES_TO_DELETE = [
  'eastern-zhou-period',
  'eastern-zhou',
  'feudal-lords',
  'independent-states',
  'inter-state-warfare',
  'interstate-warfare',
  'zhou-king',
  'zhou-dynasty',
  'zhou-decline',
  'spring-autumn',
  'warring-states',
  'separate-states',
  'frequent-warfare',
  'ming-dynasty',
  'ming-bureaucracy',
  'ming-trade',
  'ming-fall',
  'tumu-crisis',
  'tumucrisis',
  'meiji-restoration',
  'meiji-constitution',
  'meiji-military',
  'meiji-education',
  'sino-japanese-war',
  'russo-japanese-war',
  'tokugawa-shogunate',
  'tokugawa-period',
  'edo-period',
  'edo-bakufu',
  'shinto',
  'jomon',
  'yamato',
  'amaterasu',
];

let deletedNodes = 0;
for (const id of SLUG_NODES_TO_DELETE) {
  if (g.nodes[id]) {
    delete g.nodes[id];
    deletedNodes++;
  }
}

let deletedEdges = 0;
for (const edgeId of Object.keys(g.edges)) {
  const e = g.edges[edgeId];
  if (SLUG_NODES_TO_DELETE.includes(e.source) || SLUG_NODES_TO_DELETE.includes(e.target)) {
    delete g.edges[edgeId];
    deletedEdges++;
  }
}

for (const jobId of Object.keys(g.jobContributions)) {
  g.jobContributions[jobId] = g.jobContributions[jobId].filter(nid => !SLUG_NODES_TO_DELETE.includes(nid));
}

g.statistics.totalNodes = Object.keys(g.nodes).length;
g.statistics.totalEdges = Object.keys(g.edges).length;
g.lastUpdated = new Date().toISOString();

const after = Object.keys(g.nodes).length;
const afterEdges = Object.keys(g.edges).length;
console.log('Nodes: ' + before + ' -> ' + after + ' (deleted ' + deletedNodes + ')');
console.log('Edges: ' + beforeEdges + ' -> ' + afterEdges + ' (deleted ' + deletedEdges + ')');

const byDomain = {};
for (const k of Object.keys(g.nodes)) {
  const m = k.match(/^([A-Z]{2})-([A-Z]{2})/);
  if (m) {
    const d = m[1] + '-' + m[2];
    byDomain[d] = (byDomain[d] || 0) + 1;
  }
}
console.log('Remaining nodes by domain:');
for (const [k, v] of Object.entries(byDomain).sort()) {
  console.log('  ' + k + ': ' + v);
}

const sample = [];
for (const k of Object.keys(g.nodes).slice(0, 8)) {
  const n = g.nodes[k];
  sample.push({ id: n.id, name: n.name, x: n.x, y: n.y, unit: n.unit });
}
console.log('Sample nodes:');
console.log(JSON.stringify(sample, null, 2));

fs.writeFileSync(path, JSON.stringify(g, null, 2), 'utf-8');
console.log('Wrote ' + path);
console.log('  Size: ' + fs.statSync(path).size + ' bytes');
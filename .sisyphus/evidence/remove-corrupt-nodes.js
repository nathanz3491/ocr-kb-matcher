const fs = require('fs');
const path = 'C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf-8'));

const before = Object.keys(g.nodes).length;
const beforeEdges = Object.keys(g.edges).length;

const CORRUPT_IDS = ['EA-CH-002', 'EA-CH-003', 'EA-CH-005', 'EA-CH-007', 'EA-CH-008'];

console.log('Deleting corrupt nodes (slug content, orphan positions, no unit field):');
let deletedNodes = 0;
for (const id of CORRUPT_IDS) {
  if (g.nodes[id]) {
    console.log('  REMOVE ' + id + ' | ' + g.nodes[id].name + ' | x=' + g.nodes[id].x + ',y=' + g.nodes[id].y);
    delete g.nodes[id];
    deletedNodes++;
  }
}

let deletedEdges = 0;
for (const edgeId of Object.keys(g.edges)) {
  const e = g.edges[edgeId];
  if (CORRUPT_IDS.includes(e.source) || CORRUPT_IDS.includes(e.target)) {
    delete g.edges[edgeId];
    deletedEdges++;
  }
}

for (const jobId of Object.keys(g.jobContributions)) {
  g.jobContributions[jobId] = g.jobContributions[jobId].filter(nid => !CORRUPT_IDS.includes(nid));
}

g.statistics.totalNodes = Object.keys(g.nodes).length;
g.statistics.totalEdges = Object.keys(g.edges).length;
g.lastUpdated = new Date().toISOString();

console.log('');
console.log('Nodes: ' + before + ' -> ' + Object.keys(g.nodes).length + ' (deleted ' + deletedNodes + ')');
console.log('Edges: ' + beforeEdges + ' -> ' + Object.keys(g.edges).length + ' (deleted ' + deletedEdges + ')');

const byDomain = {};
for (const k of Object.keys(g.nodes)) {
  const m = k.match(/^([A-Z]{2})-([A-Z]{2})/);
  if (m) {
    const d = m[1] + '-' + m[2];
    byDomain[d] = (byDomain[d] || 0) + 1;
  }
}
console.log('Remaining domain counts:');
for (const [k, v] of Object.entries(byDomain).sort()) {
  console.log('  ' + k + ': ' + v);
}

fs.writeFileSync(path, JSON.stringify(g, null, 2), 'utf-8');
console.log('Wrote ' + path + ' (' + fs.statSync(path).size + ' bytes)');
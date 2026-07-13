const fs = require('fs');
const path = 'C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json';
const g = JSON.parse(fs.readFileSync(path, 'utf-8'));

const RESTORE = {
  'EA-CH-002': {
    id: 'EA-CH-002',
    name: 'Western Zhou Dynasty (1046-771 BCE)',
    domain: 'East Asia - Unit 1',
    description: 'The Western Zhou Dynasty (1046-771 BCE) was founded by King Wu after overthrowing the Shang Dynasty. The Zhou established the Mandate of Heaven concept (divine right to rule based on virtue) and the fengjian (feudal) system where the king granted land to nobles in exchange for military and political loyalty. The capital was at Haojing near modern Xian. The Western Zhou ended in 771 BCE when nomadic Quanrong tribes sacked the capital.',
    prerequisites: ['EA-CH-001'],
    nextSteps: ['EA-CH-003'],
    x: 3300,
    y: 4900,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Ancient'
  },
  'EA-CH-003': {
    id: 'EA-CH-003',
    name: 'Eastern Zhou Dynasty (770-256 BCE)',
    domain: 'East Asia - Unit 1',
    description: 'The Eastern Zhou Dynasty (770-256 BCE) began when King Ping moved the capital east to Luoyang after the Western Zhou capital was sacked. The Eastern Zhou period is divided into the Spring and Autumn period (770-476 BCE) and the Warring States period (475-221 BCE). Royal authority weakened dramatically as feudal lords gained power, leading to the era of the Hundred Schools of Thought in Chinese philosophy (Confucianism, Daoism, Legalism, Mohism).',
    prerequisites: ['EA-CH-002'],
    nextSteps: ['EA-CH-005', 'EA-CH-008'],
    x: 3300,
    y: 4500,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Ancient'
  },
  'EA-CH-005': {
    id: 'EA-CH-005',
    name: 'Spring and Autumn Period (770-476 BCE)',
    domain: 'East Asia - Unit 1',
    description: 'The Spring and Autumn period (770-476 BCE) was the first half of the Eastern Zhou, named after the Spring and Autumn Annals attributed to Confucius. During this era, the Zhou kings held nominal authority while powerful states like Qi, Jin, Chu, and Qin competed for hegemony. The system of hegemons (ba) emerged where dominant states claimed protective leadership while honoring the Zhou king nominally. The Hundred Schools of Thought began during this period.',
    prerequisites: ['EA-CH-003'],
    nextSteps: ['EA-CH-008'],
    x: 3050,
    y: 4250,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Ancient'
  },
  'EA-CH-007': {
    id: 'EA-CH-007',
    name: 'Mandate of Heaven (Tianming)',
    domain: 'East Asia - Unit 1',
    description: 'The Mandate of Heaven (Tianming) was a political and religious doctrine developed during the Zhou Dynasty to justify the overthrow of the Shang. It held that Heaven granted the right to rule to virtuous dynasties and withdrew it from corrupt ones, providing moral justification for dynastic change. The mandate required the ruler to govern justly; natural disasters, social unrest, and moral decay were interpreted as signs of lost mandate. This concept underpinned Chinese political philosophy for 3000 years.',
    prerequisites: ['EA-CH-001'],
    nextSteps: ['EA-CH-038'],
    x: 3700,
    y: 5050,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Ancient'
  },
  'EA-CH-008': {
    id: 'EA-CH-008',
    name: 'Warring States Period (475-221 BCE)',
    domain: 'East Asia - Unit 1',
    description: 'The Warring States period (475-221 BCE) was the second half of the Eastern Zhou, characterized by constant warfare between seven major states: Qin, Qi, Chu, Yan, Han, Wei, and Zhao. The period saw the rise of Legalist philosophy (Han Feizi, Shang Yang), the reforms of Shang Yang in Qin, and the eventual unification of China by Qin Shi Huang in 221 BCE. Major technological advances included iron weapons, the crossbow, and cavalry warfare. The Hundred Schools of Thought flourished with Mohism, Legalism, and later Daoism competing with Confucianism.',
    prerequisites: ['EA-CH-003', 'EA-CH-005'],
    nextSteps: ['EA-CH-010'],
    x: 2800,
    y: 4000,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Ancient'
  }
};

const RESTORE_EDGES = {
  'EA-CH-002-EA-CH-001': { id: 'EA-CH-002-EA-CH-001', source: 'EA-CH-002', target: 'EA-CH-001', label: 'preceded' },
  'EA-CH-003-EA-CH-002': { id: 'EA-CH-003-EA-CH-002', source: 'EA-CH-003', target: 'EA-CH-002', label: 'preceded' },
  'EA-CH-003-EA-CH-004': { id: 'EA-CH-003-EA-CH-004', source: 'EA-CH-003', target: 'EA-CH-004', label: 'synchronized_with' },
  'EA-CH-003-EA-CH-005': { id: 'EA-CH-003-EA-CH-005', source: 'EA-CH-003', target: 'EA-CH-005', label: 'contains' },
  'EA-CH-003-EA-CH-008': { id: 'EA-CH-003-EA-CH-008', source: 'EA-CH-003', target: 'EA-CH-008', label: 'contains' },
  'EA-CH-004-EA-CH-003': { id: 'EA-CH-004-EA-CH-003', source: 'EA-CH-004', target: 'EA-CH-003', label: 'synchronized_with' },
  'EA-CH-005-EA-CH-003': { id: 'EA-CH-005-EA-CH-003', source: 'EA-CH-005', target: 'EA-CH-003', label: 'preceded' },
  'EA-CH-005-EA-CH-004': { id: 'EA-CH-005-EA-CH-004', source: 'EA-CH-005', target: 'EA-CH-004', label: 'synchronized_with' },
  'EA-CH-005-EA-CH-008': { id: 'EA-CH-005-EA-CH-008', source: 'EA-CH-005', target: 'EA-CH-008', label: 'preceded' },
  'EA-CH-007-EA-CH-001': { id: 'EA-CH-007-EA-CH-001', source: 'EA-CH-007', target: 'EA-CH-001', label: 'preceded' },
  'EA-CH-007-EA-CH-002': { id: 'EA-CH-007-EA-CH-002', source: 'EA-CH-007', target: 'EA-CH-002', label: 'preceded' },
  'EA-CH-007-EA-CH-038': { id: 'EA-CH-007-EA-CH-038', source: 'EA-CH-007', target: 'EA-CH-038', label: 'influenced' },
  'EA-CH-008-EA-CH-003': { id: 'EA-CH-008-EA-CH-003', source: 'EA-CH-008', target: 'EA-CH-003', label: 'preceded' },
  'EA-CH-008-EA-CH-005': { id: 'EA-CH-008-EA-CH-005', source: 'EA-CH-008', target: 'EA-CH-005', label: 'synchronized_with' },
  'EA-CH-008-EA-CH-010': { id: 'EA-CH-008-EA-CH-010', source: 'EA-CH-008', target: 'EA-CH-010', label: 'preceded' },
  'EA-CH-008-EA-CH-051': { id: 'EA-CH-008-EA-CH-051', source: 'EA-CH-008', target: 'EA-CH-051', label: 'synchronized_with' }
};

let restoredNodes = 0;
for (const [id, node] of Object.entries(RESTORE)) {
  g.nodes[id] = node;
  restoredNodes++;
  console.log('  RESTORED ' + id + ' | ' + node.name + ' | x=' + node.x + ',y=' + node.y + ' | unit=' + node.unit);
}

let restoredEdges = 0;
for (const [id, edge] of Object.entries(RESTORE_EDGES)) {
  g.edges[id] = edge;
  restoredEdges++;
}
console.log('  Restored ' + restoredEdges + ' edges');

g.statistics.totalNodes = Object.keys(g.nodes).length;
g.statistics.totalEdges = Object.keys(g.edges).length;
g.lastUpdated = new Date().toISOString();

fs.writeFileSync(path, JSON.stringify(g, null, 2), 'utf-8');
console.log('Wrote ' + path + ' (' + fs.statSync(path).size + ' bytes)');
console.log('Final: ' + g.statistics.totalNodes + ' nodes, ' + g.statistics.totalEdges + ' edges');

const byUnit = {};
for (const k of Object.keys(g.nodes)) {
  const u = g.nodes[k].unit;
  if (u) byUnit[u] = (byUnit[u] || 0) + 1;
}
console.log('By unit: ' + JSON.stringify(byUnit));
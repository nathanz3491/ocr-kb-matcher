const fs = require('fs');

const graph = JSON.parse(fs.readFileSync('./data/knowledge-graph.json', 'utf-8'));

const HEXAGON = {
  centerX: 5000,
  centerY: 5000,
  radius: 3500,
};

const CIVILIZATIONS = {
  'EA-CH': { angle: 0, color: '#ef4444' },
  'EA-JP': { angle: 60, color: '#a855f7' },
  'EA-KR': { angle: 120, color: '#3b82f6' },
  'SA-IN': { angle: 180, color: '#f59e0b' },
  'SEA': { angle: 240, color: '#10b981' },
  'CA-ST': { angle: 300, color: '#6366f1' },
};

function getHexPosition(angle) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: HEXAGON.centerX + HEXAGON.radius * Math.cos(rad),
    y: HEXAGON.centerY + HEXAGON.radius * Math.sin(rad)
  };
}

const nodesByCiv = {};
for (const [id, node] of Object.entries(graph.nodes)) {
  const civKey = id.substring(0, 5);
  if (!nodesByCiv[civKey]) nodesByCiv[civKey] = [];
  nodesByCiv[civKey].push({ id, node });
}

const INNER_SPIRAL_SPACING = 280;
const INNER_SPIRAL_START = 400;

for (const [civKey, nodes] of Object.entries(nodesByCiv)) {
  const civInfo = CIVILIZATIONS[civKey];
  if (!civInfo) continue;
  
  const center = getHexPosition(civInfo.angle);
  
  nodes.sort((a, b) => {
    const unitA = a.node.unit || '';
    const unitB = b.node.unit || '';
    if (unitA !== unitB) return unitA.localeCompare(unitB);
    return a.id.localeCompare(b.id);
  });
  
  nodes.forEach((item, index) => {
    const node = item.node;
    const spiralRadius = INNER_SPIRAL_START + index * INNER_SPIRAL_SPACING;
    const spiralAngle = index * 25;
    
    const rad = (spiralAngle * Math.PI) / 180;
    const x = center.x + spiralRadius * Math.cos(rad);
    const y = center.y + spiralRadius * Math.sin(rad);
    
    node.x = Math.round(x);
    node.y = Math.round(y);
  });
}

graph.lastUpdated = new Date().toISOString();
fs.writeFileSync('./data/knowledge-graph.json', JSON.stringify(graph, null, 2));

console.log('Hexagon layout regenerated:');
console.log('- Hexagon radius: ' + HEXAGON.radius);
console.log('- Inner spiral spacing: ' + INNER_SPIRAL_SPACING);
console.log('\nCivilization centers:');
for (const [civ, info] of Object.entries(CIVILIZATIONS)) {
  const pos = getHexPosition(info.angle);
  console.log(`  ${civ}: x=${Math.round(pos.x)}, y=${Math.round(pos.y)}`);
}

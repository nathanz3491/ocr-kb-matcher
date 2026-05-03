const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'knowledge-graph.json');
const g = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const nodeName = (id) => (g.nodes[id] ? g.nodes[id].name.toLowerCase() : '');
const nodeDomain = (id) => (g.nodes[id] ? (g.nodes[id].domain || '') : '');

// Keywords for each relationship type
const CONQUERED = ['conquered', 'conquer', 'unification', 'unified'];
const INVADED = ['invaded', 'invasion', 'invade'];
const RAIDED = ['raided', 'raid'];
const TRADED = ['trade', 'silk road', 'commercial', 'commerce', 'maritime trade', 'trade route'];
const CULTURAL = ['cultural', 'culture', 'diffusion', 'exchange', 'influence', 'influenced'];
const RELIGIOUS_SPREAD = ['buddhis', 'christian', 'islam', 'spread', 'missionar', 'zoroastrian', 'manichae'];
const BORDERED = ['border', 'neighbor', 'adjacent'];
const ALLIANCE = ['alliance', 'ally', 'allied', 'treaty'];
const PHILOSOPHY = ['philosoph', 'confucian', 'daoism', 'legalism', 'mohism', 'hundred schools'];
const DYNASTY = ['dynasty', 'dynast'];
const SEQUENTIAL_DYNASTY = ['dynasty', 'period', 'war', 'age'];

function matchesAny(text, keywords) {
  return keywords.some(kw => text.includes(kw));
}

function inferLabel(src, tgt, srcNode, tgtNode) {
  const sName = srcNode.name.toLowerCase();
  const tName = tgtNode.name.toLowerCase();
  const sDomain = nodeDomain(src);
  const tDomain = nodeDomain(tgt);

  // Dynasty sequential relationships → "preceded"
  const srcIsDynasty = matchesAny(sName, DYNASTY);
  const tgtIsDynasty = matchesAny(tName, DYNASTY);
  const srcIsPeriod = matchesAny(sName, ['period', 'war', 'age']);
  const tgtIsPeriod = matchesAny(tName, ['period', 'war', 'age']);

  // Same domain + dynasty/period → likely sequential
  if ((srcIsDynasty || srcIsPeriod) && (tgtIsDynasty || tgtIsPeriod)) {
    if (sDomain === tDomain && sDomain !== '') {
      return 'preceded';
    }
    // Cross-domain dynasty transitions (e.g., Han -> Sui -> Tang) are also sequential
    if (srcIsDynasty && tgtIsDynasty) {
      return 'preceded';
    }
  }

  // Philosophy schools → "synchronized_with"
  if (matchesAny(sName, PHILOSOPHY) || matchesAny(tName, PHILOSOPHY)) {
    return 'synchronized_with';
  }

  // Conquered/Unification
  if (matchesAny(sName, CONQUERED) || matchesAny(sName, ['unification', 'unified'])) {
    return 'conquered';
  }
  if (matchesAny(tName, CONQUERED)) {
    return 'conquered';
  }

  // Invaded
  if (matchesAny(sName, INVADED) || matchesAny(tName, INVADED)) {
    return 'invaded';
  }

  // Raided
  if (matchesAny(sName, RAIDED) || matchesAny(tName, RAIDED)) {
    return 'raided';
  }

  // Trade
  if (matchesAny(sName, TRADED) || matchesAny(tName, TRADED)) {
    return 'traded_with';
  }

  // Cultural influence/diffusion
  if (matchesAny(sName, CULTURAL) || matchesAny(tName, CULTURAL)) {
    return 'influenced';
  }

  // Religious spread
  if (matchesAny(sName, RELIGIOUS_SPREAD) || matchesAny(tName, RELIGIOUS_SPREAD)) {
    return 'spread_to';
  }

  // Border contact
  if (matchesAny(sName, BORDERED) || matchesAny(tName, BORDERED)) {
    return 'bordered';
  }

  // Alliance
  if (matchesAny(sName, ALLIANCE) || matchesAny(tName, ALLIANCE)) {
    return 'allied_with';
  }

  // Cross-domain with same domain prefix (e.g., EA-CH → EA-KR) often represents regional influence
  const srcRegion = src.split('-').slice(0, 2).join('-');
  const tgtRegion = tgt.split('-').slice(0, 2).join('-');
  if (srcRegion !== tgtRegion) {
    // Different regions likely have cross-cultural relationships, not pure "requires"
    return 'influenced';
  }

  // Same domain + same unit number = sequential study progression → "preceded"
  const srcUnit = sDomain.match(/Unit (\d+)/);
  const tgtUnit = tDomain.match(/Unit (\d+)/);
  if (srcUnit && tgtUnit && srcUnit[1] === tgtUnit[1]) {
    return 'preceded';
  }

  // Genuine prerequisites (foundations before advanced concepts)
  return 'requires';
}

let changed = 0;
let unchanged = 0;

Object.values(g.edges).forEach(edge => {
  if (edge.label === 'requires') {
    const srcNode = g.nodes[edge.source];
    const tgtNode = g.nodes[edge.target];
    if (!srcNode || !tgtNode) return;

    const newLabel = inferLabel(edge.source, edge.target, srcNode, tgtNode);
    if (newLabel !== 'requires') {
      console.log(`  "${edge.label}" → "${newLabel}" : ${srcNode.name} → ${tgtNode.name}`);
      edge.label = newLabel;
      changed++;
    } else {
      unchanged++;
    }
  }
});

fs.writeFileSync(filePath, JSON.stringify(g, null, 2));
console.log(`\nDone. Changed ${changed} edges to more specific labels. ${unchanged} kept as "requires".`);

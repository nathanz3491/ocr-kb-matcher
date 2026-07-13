const fs = require('fs');

const KG_PATH = 'C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json';
const kg = JSON.parse(fs.readFileSync(KG_PATH, 'utf-8'));
const validIds = new Set(Object.keys(kg.nodes));

const FILES = [
  'C:/Users/64887/ocr-kb-matcher/backend/data/user-progress.json',
  'C:/Users/64887/ocr-kb-matcher/backend/data/reviews.json'
];

for (const file of FILES) {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  let changed = false;

  if (data.knownNodes) {
    const before = data.knownNodes.length;
    data.knownNodes = data.knownNodes.filter(id => validIds.has(id));
    if (data.knownNodes.length !== before) changed = true;
  }
  if (data.unknownNodes) {
    const before = data.unknownNodes.length;
    data.unknownNodes = data.unknownNodes.filter(id => validIds.has(id));
    if (data.unknownNodes.length !== before) changed = true;
  }
  if (data.learnedAt) {
    const before = Object.keys(data.learnedAt).length;
    for (const k of Object.keys(data.learnedAt)) {
      if (!validIds.has(k)) { delete data.learnedAt[k]; changed = true; }
    }
  }
  if (data.nodeMastery) {
    const before = Object.keys(data.nodeMastery).length;
    for (const k of Object.keys(data.nodeMastery)) {
      if (!validIds.has(k)) { delete data.nodeMastery[k]; changed = true; }
    }
  }
  if (data.reviews) {
    const before = Object.keys(data.reviews).length;
    for (const k of Object.keys(data.reviews)) {
      if (!validIds.has(k)) { delete data.reviews[k]; changed = true; }
    }
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Cleaned: ' + file);
  } else {
    console.log('No changes: ' + file);
  }
}

const up = JSON.parse(fs.readFileSync('C:/Users/64887/ocr-kb-matcher/backend/data/user-progress.json', 'utf-8'));
console.log('');
console.log('user-progress after cleanup:');
console.log('  knownNodes:', up.knownNodes);
const fs = require('fs');
const path = require('path');

const SLUG_TO_CANONICAL = {
  'eastern-zhou-period': 'EA-CH-003',
  'warring-states': 'EA-CH-008',
  'spring-autumn': 'EA-CH-005',
  'inter-state-warfare': 'EA-CH-007',
  'interstate-warfare': 'EA-CH-007',
  'frequent-warfare': 'EA-CH-007',
  'feudal-lords': 'EA-CH-003',
  'independent-states': 'EA-CH-003',
  'separate-states': 'EA-CH-003',
  'zhou-king': 'EA-CH-003',
  'zhou-dynasty': 'EA-CH-002',
  'zhou-decline': 'EA-CH-003',
  'meiji-restoration': 'EA-JP-029',
  'meiji-constitution': 'EA-JP-029',
  'meiji-military': 'EA-JP-029',
  'meiji-education': 'EA-JP-029',
  'sino-japanese-war': 'EA-JP-029',
  'russo-japanese-war': 'EA-JP-029',
  'tokugawa-shogunate': 'EA-JP-026',
  'tokugawa-period': 'EA-JP-026',
  'edo-period': 'EA-JP-026',
  'edo-bakufu': 'EA-JP-026',
  'shinto': 'EA-JP-032',
  'jomon': 'EA-JP-033',
  'yamato': 'EA-JP-001',
  'amaterasu': 'EA-JP-001',
  'ming-dynasty': 'EA-CH-038',
  'ming-bureaucracy': 'EA-CH-040',
  'ming-trade': 'EA-CH-042',
  'ming-fall': 'EA-CH-045',
  'tumucrisis': 'EA-CH-043',
  'tumu-crisis': 'EA-CH-043',
};

const DATA_DIR = 'C:/Users/64887/ocr-kb-matcher/backend/data';

function rewriteFile(file) {
  const fullPath = path.join(DATA_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.log('  SKIP (not found):', file);
    return 0;
  }
  const before = fs.readFileSync(fullPath, 'utf-8');
  let after = before;
  let count = 0;
  for (const [slug, canon] of Object.entries(SLUG_TO_CANONICAL)) {
    const re = new RegExp(`"${slug}"`, 'g');
    const matches = after.match(re);
    if (matches && matches.length > 0) {
      after = after.replace(re, `"${canon}"`);
      count += matches.length;
    }
  }
  if (count > 0) {
    fs.writeFileSync(fullPath, after, 'utf-8');
    console.log('  REWROTE', count, 'refs:', file);
  } else {
    console.log('  no refs:', file);
  }
  return count;
}

console.log('=== 1. Data file references ===');
let total = 0;
for (const f of ['user-progress.json', 'reviews.json', 'knowledge-graph.json', 'game-questions.json']) {
  total += rewriteFile(f);
}
console.log('  Total refs rewritten in data files:', total);

console.log('');
console.log('=== 2. Flashcard files: merge slug files into canonical ===');
const FC_DIR = path.join(DATA_DIR, 'flashcards');
const files = fs.readdirSync(FC_DIR).filter(f => f.endsWith('.json'));
for (const f of files) {
  const id = f.replace('.json', '');
  const canonical = SLUG_TO_CANONICAL[id] || id;
  if (canonical !== id) {
    const slugPath = path.join(FC_DIR, f);
    const canonPath = path.join(FC_DIR, canonical + '.json');
    if (fs.existsSync(canonPath)) {
      const slugData = JSON.parse(fs.readFileSync(slugPath, 'utf-8'));
      const canonData = JSON.parse(fs.readFileSync(canonPath, 'utf-8'));
      const seen = new Set((canonData.cards || []).map(c => c.id));
      for (const card of (slugData.cards || [])) {
        if (!seen.has(card.id)) {
          canonData.cards = canonData.cards || [];
          canonData.cards.push(card);
          seen.add(card.id);
        }
      }
      canonData.updatedAt = new Date().toISOString();
      fs.writeFileSync(canonPath, JSON.stringify(canonData, null, 2), 'utf-8');
      fs.unlinkSync(slugPath);
      console.log('  MERGED', f, '->', canonical + '.json (', slugData.cards.length, 'cards )');
    } else {
      const slugData = JSON.parse(fs.readFileSync(slugPath, 'utf-8'));
      slugData.nodeId = canonical;
      fs.writeFileSync(canonPath, JSON.stringify(slugData, null, 2), 'utf-8');
      fs.unlinkSync(slugPath);
      console.log('  RENAMED', f, '->', canonical + '.json (nodeId rewritten)');
    }
  }
}

console.log('');
console.log('=== 3. Final state ===');
const afterFiles = fs.readdirSync(FC_DIR).filter(f => f.endsWith('.json'));
console.log('Flashcard files now:', afterFiles.length);
for (const f of afterFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(FC_DIR, f), 'utf-8'));
  console.log('  ', f, '|', data.nodeId, '|', (data.cards || []).length, 'cards');
}
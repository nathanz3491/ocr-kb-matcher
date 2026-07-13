const fs = require('fs');

const UP = 'C:/Users/64887/ocr-kb-matcher/backend/data/user-progress.json';
const REV = 'C:/Users/64887/ocr-kb-matcher/backend/data/reviews.json';

const restoredProgress = {
  knownNodes: ['EA-CH-002', 'EA-CH-003', 'EA-CH-008', 'EA-CH-007', 'EA-CH-005'],
  unknownNodes: ['A03', 'A04', 'C02', 'F01', 'G01', 'G02', 'G03', 'S01', 'V01'],
  lastUpdated: '2026-04-18T03:08:22.926Z',
  learnedAt: {
    'EA-CH-002': '2026-04-17T06:20:53.447Z',
    'EA-CH-003': '2026-04-17T04:14:26.826Z',
    'EA-CH-007': '2026-04-17T06:26:28.319Z',
    'EA-CH-005': '2026-04-17T06:26:28.319Z',
    'EA-CH-008': '2026-04-17T06:26:28.319Z'
  },
  nodeMastery: {
    'EA-CH-002': 15,
    'EA-CH-003': 15,
    'EA-CH-007': 15,
    'EA-CH-005': 15,
    'EA-CH-008': 15,
    'CA-ST-027': 6
  }
};

const restoredReviews = {
  reviews: {
    'EA-CH-003': {
      nodeId: 'EA-CH-003',
      lastReviewed: '2026-04-19T03:17:41.994Z',
      nextReviewDate: '2026-04-28T03:17:41.994Z',
      reviewCount: 11,
      interval: 9,
      easeFactor: 2.1799999999999997
    }
  }
};

fs.writeFileSync(UP, JSON.stringify(restoredProgress, null, 2), 'utf-8');
console.log('Wrote ' + UP);
console.log('  knownNodes:', restoredProgress.knownNodes);

fs.writeFileSync(REV, JSON.stringify(restoredReviews, null, 2), 'utf-8');
console.log('Wrote ' + REV);
console.log('  reviews:', Object.keys(restoredReviews.reviews));
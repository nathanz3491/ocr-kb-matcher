#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH
LOG=/tmp/restore-deploy.log
echo "=== Restore deploy $(date -Iseconds) ===" | tee $LOG

cd /home/nathan/ocr-kb-matcher

echo "" | tee -a $LOG
echo "[1] Verify KG shape" | tee -a $LOG
/home/nathan/.nvm/versions/node/v20.20.2/bin/node -e "
const g=require('/home/nathan/ocr-kb-matcher/backend/data/knowledge-graph.json');
const counts={};
for(const k in g.nodes){const m=k.match(/^EA-([A-Z]{2})/);if(m) counts[m[1]]=(counts[m[1]]||0)+1;}
console.log('  Domain counts:', JSON.stringify(counts));
console.log('  EA-CH-002:', g.nodes['EA-CH-002']?.name || 'MISSING');
console.log('  EA-CH-003:', g.nodes['EA-CH-003']?.name || 'MISSING');
console.log('  EA-CH-005:', g.nodes['EA-CH-005']?.name || 'MISSING');
console.log('  EA-CH-007:', g.nodes['EA-CH-007']?.name || 'MISSING');
console.log('  EA-CH-008:', g.nodes['EA-CH-008']?.name || 'MISSING');
console.log('  Total nodes:', Object.keys(g.nodes).length, '/ edges:', Object.keys(g.edges).length);
" | tee -a $LOG

echo "" | tee -a $LOG
echo "[2] Kill old backend" | tee -a $LOG
for pid in $(ps auxf 2>&1 | grep 'dist/backend/src/index.js' | grep -v grep | awk '{print $2}'); do
  kill -9 $pid 2>/dev/null
  echo "  killed $pid" | tee -a $LOG
done
sleep 2

echo "" | tee -a $LOG
echo "[3] Start new backend" | tee -a $LOG
cd /home/nathan/ocr-kb-matcher/backend
setsid bash -c 'node dist/backend/src/index.js > /tmp/backend.log 2>&1 < /dev/null' &
disown
sleep 4

echo "" | tee -a $LOG
echo "[4] Process check" | tee -a $LOG
ps auxf 2>&1 | grep -E 'dist/backend/src/index.js' | grep -v grep | tee -a $LOG

echo "" | tee -a $LOG
echo "[5] Live endpoints" | tee -a $LOG
echo -n "  Backend health: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health | tee -a $LOG
echo -n "  Game questions API: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3001/api/game-questions?unit=U1' | tee -a $LOG
echo -n "  Live KG API: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3001/api/knowledge-graph' | tee -a $LOG
echo -n "  Live KG has EA-CH-002 (Western Zhou): " | tee -a $LOG
curl -s 'http://localhost:3001/api/knowledge-graph' 2>&1 | grep -o 'EA-CH-002[^}]*' | head -c 100
echo "" | tee -a $LOG
echo -n "  Live KG has EA-CH-008 (Warring States): " | tee -a $LOG
curl -s 'http://localhost:3001/api/knowledge-graph' 2>&1 | grep -o 'EA-CH-008[^}]*' | head -c 100
echo "" | tee -a $LOG
echo -n "  Live KG has slug 'warring-states': " | tee -a $LOG
curl -s 'http://localhost:3001/api/knowledge-graph' 2>&1 | grep -c 'warring-states'
echo "" | tee -a $LOG
echo -n "  Live KG has slug 'eastern-zhou-period': " | tee -a $LOG
curl -s 'http://localhost:3001/api/knowledge-graph' 2>&1 | grep -c 'eastern-zhou-period'
echo "" | tee -a $LOG
echo -n "  Flashcard EA-CH-003 (Eastern Zhou): " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3001/api/flashcards/EA-CH-003' | tee -a $LOG
echo -n "  Flashcard EA-CH-008 (Warring States): " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3001/api/flashcards/EA-CH-008' | tee -a $LOG
echo -n "  mastri.app/teacher/game-bank: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'https://mastri.app/teacher/game-bank' | tee -a $LOG
echo -n "  mastri.app root: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'https://mastri.app/' | tee -a $LOG

echo "" | tee -a $LOG
echo "=== Done $(date -Iseconds) ===" | tee -a $LOG
#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH
LOG=/tmp/deploy-fixes.log
echo "=== Deploy fixes $(date -Iseconds) ===" | tee $LOG

cd /home/nathan/ocr-kb-matcher

echo "" | tee -a $LOG
echo "[1] Kill old backend" | tee -a $LOG
for pid in $(ps auxf 2>&1 | grep 'dist/backend/src/index.js' | grep -v grep | awk '{print $2}'); do
  kill -9 $pid 2>/dev/null
  echo "  killed $pid" | tee -a $LOG
done
sleep 2
ps auxf 2>&1 | grep 'dist/backend/src/index.js' | grep -v grep || echo "  all killed" | tee -a $LOG

echo "" | tee -a $LOG
echo "[2] Start new backend" | tee -a $LOG
cd /home/nathan/ocr-kb-matcher/backend
setsid bash -c 'node dist/backend/src/index.js > /tmp/backend.log 2>&1 < /dev/null' &
disown
sleep 4

echo "" | tee -a $LOG
echo "[3] Process check" | tee -a $LOG
ps auxf 2>&1 | grep -E 'dist/backend/src/index.js' | grep -v grep | tee -a $LOG

echo "" | tee -a $LOG
echo "[4] Verify KG has Meiji" | tee -a $LOG
node -e "const g=require('/home/nathan/ocr-kb-matcher/backend/data/knowledge-graph.json'); const m=g.nodes['EA-JP-029']; console.log('  EA-JP-029:', m ? m.name : 'MISSING'); console.log('  total nodes:', Object.keys(g.nodes).length);" | tee -a $LOG

echo "" | tee -a $LOG
echo "[5] Verify slug flashcards merged" | tee -a $LOG
ls /home/nathan/ocr-kb-matcher/backend/data/flashcards/ | tee -a $LOG

echo "" | tee -a $LOG
echo "[6] Live endpoints" | tee -a $LOG
echo -n "  Backend health: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/health | tee -a $LOG
echo -n "  Game questions API: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3001/api/game-questions?unit=U7' | tee -a $LOG
echo -n "  Knowledge graph: " | tee -a $LOG
curl -s 'http://localhost:3001/api/knowledge-graph' 2>&1 | head -c 100 | tee -a $LOG
echo "" | tee -a $LOG
echo -n "  EA-JP-029 in graph API: " | tee -a $LOG
curl -s 'http://localhost:3001/api/knowledge-graph' 2>&1 | grep -c 'EA-JP-029' | tee -a $LOG
echo -n "  Flashcards (eastern-zhou-period): " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3001/api/flashcards/EA-CH-003' | tee -a $LOG
echo -n "  Flashcards (eastern-zhou-period slug): " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:3001/api/flashcards/eastern-zhou-period' | tee -a $LOG
echo -n "  mastri.app/teacher/game-bank: " | tee -a $LOG
curl -s -o /dev/null -w "%{http_code}\n" 'https://mastri.app/teacher/game-bank' | tee -a $LOG

echo "" | tee -a $LOG
echo "=== Backend log (last 5 lines) ===" | tee -a $LOG
tail -5 /tmp/backend.log | tee -a $LOG

echo "" | tee -a $LOG
echo "=== Deploy complete $(date -Iseconds) ===" | tee -a $LOG
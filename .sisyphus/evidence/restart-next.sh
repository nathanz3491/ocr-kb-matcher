#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH
LOG=/tmp/kg-restart.log
echo "=== KG frontend restart $(date -Iseconds) ===" | tee $LOG

cd /home/nathan/ocr-kb-matcher

echo "" | tee -a $LOG
echo "[1] Kill old next-server" | tee -a $LOG
NEXT_PID=$(ps auxf 2>&1 | grep 'next-server' | grep -v grep | awk '{print $2}' | head -1)
echo "  killing $NEXT_PID" | tee -a $LOG
kill $NEXT_PID 2>&1 || true
sleep 3

echo "" | tee -a $LOG
echo "[2] Start new next-server" | tee -a $LOG
cd /home/nathan/ocr-kb-matcher
setsid bash -c 'npx next start -p 3000 > /tmp/frontend.log 2>&1 < /dev/null' &
disown
sleep 12

echo "" | tee -a $LOG
echo "[3] Process check" | tee -a $LOG
ps auxf 2>&1 | grep 'next-server' | grep -v grep | tee -a $LOG

echo "" | tee -a $LOG
echo "[4] Live endpoints" | tee -a $LOG
for url in / /knowledge-graph /graph-editor /api/knowledge-graph; do
  echo -n "  https://mastri.app$url -> " | tee -a $LOG
  curl -s -o /dev/null -w "%{http_code}\n" "https://mastri.app$url" | tee -a $LOG
done

echo "" | tee -a $LOG
echo "[5] Knowledge graph data" | tee -a $LOG
echo -n "  Total nodes in API: " | tee -a $LOG
curl -s 'https://mastri.app/api/knowledge-graph' 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('nodes',[])))" | tee -a $LOG
echo -n "  Total edges in API: " | tee -a $LOG
curl -s 'https://mastri.app/api/knowledge-graph' 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('edges',[])))" | tee -a $LOG

echo "" | tee -a $LOG
echo "=== Done $(date -Iseconds) ===" | tee -a $LOG
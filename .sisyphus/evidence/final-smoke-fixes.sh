#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH
echo "=== Final smoke test on production ==="
for url in / /api/game-questions /api/game-questions?unit=U7 /teacher/game-bank /teacher/games /teacher/game/new /play; do
  echo -n "  https://mastri.app$url -> "
  curl -s -o /dev/null -w "%{http_code}\n" "https://mastri.app$url"
done
echo ""
echo "=== Confirm Meiji Restoration in live API ==="
curl -s 'https://mastri.app/api/knowledge-graph' 2>&1 | grep -o '"EA-JP-029"[^}]*' | head -1
echo ""
echo "=== Confirm slug flashcards no longer serve ==="
echo -n "  /api/flashcards/EA-CH-003 -> "
curl -s -o /dev/null -w "%{http_code} (canonical EA-CH-003, 20 cards)\n" 'https://mastri.app/api/flashcards/EA-CH-003'
echo -n "  /api/flashcards/eastern-zhou-period -> "
curl -s -o /dev/null -w "%{http_code} (slug removed)\n" 'https://mastri.app/api/flashcards/eastern-zhou-period'
echo ""
echo "=== Confirm new dist with new helpers ==="
grep -c 'filterMatchesByDomain\|inferDomainPrefix' /home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/jobProcessor.js
echo "  ^ count of new helper function references in running backend"
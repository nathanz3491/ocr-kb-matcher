@echo off
set KEY=%USERPROFILE%\.ssh\id_ed25519
set REMOTE=nathan@139.199.220.244
set LOCAL=C:\Users\64887\ocr-kb-matcher
set DEST=/home/nathan/ocr-kb-matcher

scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\knowledge-graph.json" "%REMOTE%:%DEST%/backend/data/knowledge-graph.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\user-progress.json" "%REMOTE%:%DEST%/backend/data/user-progress.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\reviews.json" "%REMOTE%:%DEST%/backend/data/reviews.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-002.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-002.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-003.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-003.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-005.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-005.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-007.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-007.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-008.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-008.json"
echo === Done ===
pause
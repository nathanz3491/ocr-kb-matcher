@echo off
set KEY=%USERPROFILE%\.ssh\id_ed25519
set REMOTE=nathan@139.199.220.244
set LOCAL=C:\Users\64887\ocr-kb-matcher
set DEST=/home/nathan/ocr-kb-matcher

echo === Uploading modified backend files ===
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\src\services\aiKnowledgeMatching.ts" "%REMOTE%:%DEST%/backend/src/services/aiKnowledgeMatching.ts"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\src\services\batchMatching.ts" "%REMOTE%:%DEST%/backend/src/services/batchMatching.ts"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\src\services\jobProcessor.ts" "%REMOTE%:%DEST%/backend/src/services/jobProcessor.ts"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\src\services\knowledgeGraphStorage.ts" "%REMOTE%:%DEST%/backend/src/services/knowledgeGraphStorage.ts"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\tsconfig.build.json" "%REMOTE%:%DEST%/backend/tsconfig.build.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\knowledge-graph.json" "%REMOTE%:%DEST%/backend/data/knowledge-graph.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\user-progress.json" "%REMOTE%:%DEST%/backend/data/user-progress.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\reviews.json" "%REMOTE%:%DEST%/backend/data/reviews.json"

echo === Uploading flashcard files (8 final) ===
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\A01.json" "%REMOTE%:%DEST%/backend/data/flashcards/A01.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\A02.json" "%REMOTE%:%DEST%/backend/data/flashcards/A02.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\A04.json" "%REMOTE%:%DEST%/backend/data/flashcards/A04.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-002.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-002.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-003.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-003.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-005.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-005.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-007.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-007.json"
scp -i "%KEY%" -P 6000 "%LOCAL%\backend\data\flashcards\EA-CH-008.json" "%REMOTE%:%DEST%/backend/data/flashcards/EA-CH-008.json"

echo === Uploading prebuilt dist (faster than remote tsc) ===
scp -i "%KEY%" -P 6000 -r "%LOCAL%\backend\dist" "%REMOTE%:%DEST%/backend/"

echo === DONE ===
pause
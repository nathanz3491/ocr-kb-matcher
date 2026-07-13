@echo off
set KEY=%USERPROFILE%\.ssh\id_ed25519
set REMOTE=nathan@139.199.220.244
set LOCAL=C:\Users\64887\ocr-kb-matcher
set DEST=/home/nathan/ocr-kb-matcher

scp -i "%KEY%" -P 6000 "%LOCAL%\frontend\components\knowledge-graph\KnowledgeGraphView.tsx" "%REMOTE%:%DEST%/frontend/components/knowledge-graph/KnowledgeGraphView.tsx"
scp -i "%KEY%" -P 6000 "%LOCAL%\app\(protected)\knowledge-graph\page.tsx" "%REMOTE%:%DEST%/app/(protected)/knowledge-graph/page.tsx"
scp -i "%KEY%" -P 6000 "%LOCAL%\app\(protected)\graph-editor\page.tsx" "%REMOTE%:%DEST%/app/(protected)/graph-editor/page.tsx"
echo === Done uploading KG pages ===
pause
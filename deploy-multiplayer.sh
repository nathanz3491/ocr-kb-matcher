#!/bin/bash
# Deploy script for multiplayer quiz to vectorserver
set -e

SSH_KEY="~/.ssh/id_ed25519"
SERVER="nathan@139.199.220.244"
PORT=6000
REMOTE_BASE="/home/nathan/ocr-kb-matcher"

echo "=== STEP 1: Deploy backend files ==="
# Deploy backend game-related files
scp -i "$SSH_KEY" -P $PORT \
  backend/src/gameGateway.ts \
  backend/src/services/gameRoomService.ts \
  backend/src/services/leaderboardService.ts \
  backend/src/services/teacherLinkService.ts \
  backend/src/routes/teacherLinks.ts \
  backend/src/routes/teacherMonitor.ts \
  backend/src/routes/teacherGames.ts \
  backend/src/types/gameRoom.ts \
  backend/src/types/teacherLink.ts \
  backend/src/routes/index.ts \
  backend/data/game-questions.json \
  "$SERVER:$REMOTE_BASE/backend/src/"

echo "=== STEP 2: Deploy frontend files ==="
# Deploy frontend game pages
scp -i "$SSH_KEY" -P $PORT \
  frontend/app/teacher/dashboard/page.tsx \
  frontend/app/teacher/games/page.tsx \
  frontend/app/teacher/games/[id]/page.tsx \
  frontend/app/teacher/game/new/page.tsx \
  frontend/app/play/page.tsx \
  frontend/app/play/[gameId]/page.tsx \
  frontend/app/play/[gameId]/results/page.tsx \
  frontend/app/settings/page.tsx \
  frontend/app/auth/register/page.tsx \
  frontend/lib/auth.ts \
  frontend/lib/api.ts \
  frontend/contexts/AuthContext.tsx \
  frontend/components/navigation/Navigation.tsx \
  frontend/package.json \
  "$SERVER:$REMOTE_BASE/frontend/app/"
scp -i "$SSH_KEY" -P $PORT \
  frontend/package.json \
  "$SERVER:$REMOTE_BASE/frontend/"

echo "=== STEP 3: Install backend deps (socket.io + new services) ==="
ssh -i "$SSH_KEY" -p $PORT "$SERVER" \
  "cd $REMOTE_BASE/backend && npm install socket.io socket.io-client"

echo "=== STEP 4: Build backend ==="
ssh -i "$SSH_KEY" -p $PORT "$SERVER" \
  "cd $REMOTE_BASE/backend && npm run build"

echo "=== STEP 5: Install frontend deps ==="
ssh -i "$SSH_KEY" -p $PORT "$SERVER" \
  "cd $REMOTE_BASE/frontend && npm install"

echo "=== STEP 6: Build frontend ==="
ssh -i "$SSH_KEY" -p $PORT "$SERVER" \
  "cd $REMOTE_BASE/frontend && npm run build"

echo "=== STEP 7: Restart PM2 ==="
ssh -i "$SSH_KEY" -p $PORT "$SERVER" \
  "bash $REMOTE_BASE/start-pm2.sh"

echo "=== STEP 8: Health check ==="
sleep 5
ssh -i "$SSH_KEY" -p $PORT "$SERVER" \
  "curl -s http://localhost:3001/api/health"

echo "=== DEPLOY COMPLETE ==="

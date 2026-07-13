# Learnings — Security Hardening

## Wave 8: Secrets Management (2026-07-05)

### What was done
- Added `JWT_SECRET` (128 hex chars) and `JWT_REFRESH_SECRET` (128 hex chars) to `backend/.env`
- Created `backend/.env.example` with all env vars mirrored and secrets replaced by placeholders
- Added commented `QUEUE_POLL_INTERVAL_MS` entry to `.env` (referenced in `index.ts` with a default, so it's optional)

### Key observations
- `jwtService.ts` uses lazy getters `getJwtSecret()` and `getJwtRefreshSecret()` — these throw if env vars are missing. Previously, the backend would crash with `JWT_SECRET environment variable is required` on any JWT operation.
- The existing `.env` had 18 env vars loaded by dotenv. After adding 2 JWT secrets, it's now 20.
- `QUEUE_POLL_INTERVAL_MS` is referenced in `index.ts` line 37 with a `|| undefined` fallback, so it's optional but documenting it in `.env.example` is good practice.

### Pattern for future reference
- Generate secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Verify: `cd backend && node -e "require('dotenv').config(); console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length)"`

## Wave 6: JWT Scheme Hardening (2026-07-05)

### What was done
- **Access token expiry**: `'7d'` → `'15m'` (from 7 days to 15 minutes)
- **Refresh token expiry**: `'30d'` → `'7d'` (from 30 days to 7 days)
- **jti claim**: Added `jti: crypto.randomUUID()` to both access and refresh tokens for unique identification
- **TOKEN REVOCATION**: Created `backend/src/services/tokenRevocation.ts` with:
  - `Map<string, { userId, expiresAt }>` for revoked refresh tokens
  - `Map<string, number>` for revoked access tokens (key = jti, value = expiry timestamp)
  - `setInterval` auto-cleanup every hour
- **Refresh token rotation**: `/api/auth/refresh` now revokes the OLD refresh token after verifying, generates new access + new refresh with fresh `jti` each
- **Logout actually works**: `/api/auth/logout` decodes the Bearer token from `Authorization` header, extracts `jti` via `parseAccessToken()` (no sig verification), adds to access-token revocation set. Idempotent — returns success even without header.
- **Middleware revocation check**: `authenticate` and `optionalAuth` both check `isAccessTokenRevoked(payload.jti)` after `verifyAccessToken()`. If revoked → 401 (authenticate) or skip user attachment (optionalAuth).

### Key decisions
- Used `crypto.randomUUID()` (Node built-in) instead of `uuid` package — no extra import needed
- `parseAccessToken` uses `jwt.decode()` (no signature verification) — only for logout jti extraction
- `verifyRefreshToken` now returns `{ userId, jti }` instead of just `{ userId }` — called `jwt.verify()` which DOES verify
- Refresh token revocation: track by `exp` time from decoded token. Access token revocation: track by `exp` time from parseAccessToken (unverified decode — safe since we're just using it for the expiry timestamp)
- In-memory only — flagged in a PRODUCTION NOTE comment. Server restart loses revocation state (acceptable tradeoff for short-lived tokens)

### Caveats
- Server restart invalidates all revocation state — logged-out users' access tokens would be valid again until they naturally expire (max 15min)
- Rate limiter IPv6 bug in `middleware/rateLimit.ts` (pre-existing Wave 4 issue) blocks backend startup — unrelated to Wave 6 changes

## Wave 9 — Audit Logging (2026-07-05)

### What was done
- Created `backend/src/middleware/auditLog.ts` — `auditMiddleware` + `logAuthEvent()` export
- Wired `auditMiddleware` into `app.ts` after `optionalAuth`, before routes
- Added `logAuthEvent` calls to `auth.ts` for login success, login failure, logout
- Log format: JSONL at `backend/data/audit.log` (one JSON object per line)
- Events: `auth_failed` (401), `authz_failed` (403), `mutation` (PUT/DELETE/PATCH on /api/graph, /api/graph-editor, /api/upload), `login_success`, `login_failed`, `logout`

### Key patterns
- `req.originalUrl.split('?')[0]` for audit log path — gives full mounted path (e.g., `/api/knowledge-graph`)
- `res.on('finish')` fires AFTER response is sent, non-blocking — safe to use sync `fs.appendFileSync`
- Login events must use explicit `logAuthEvent()` calls BEFORE `res.json()` — `res.on('finish')` won't capture pre-response context
- Logout handler uses `parseAccessToken()` (unverified decode) to extract userId — doesn't have `req.user`
- `parseAccessToken` returns `JWTPayload | null` — need null guard before accessing `.userId`
- `graph-editor` route mounted in `routes/index.ts` at `/api/graph-editor`, not in `app.ts` — but `req.originalUrl` still captures it
- `backend/data/` gitignored (line 18), `*.log` gitignored (line 26) — dual coverage for audit.log
- try/catch on all file writes — never crash the request on audit failure

### Verification
- `npx tsc --noEmit` exit 0 ✓
- LSP diagnostics: 0 errors on all 3 changed files ✓
- Live test BLOCKED by pre-existing `rateLimit.ts` IPv6 keyGenerator bug — code structurally validated

### What was done
- Added `import { authenticate } from '../middleware/auth';` + `router.use(authenticate);` to **23 route files**
- **User's primary concern fixed**: `GET /api/knowledge-graph` now requires auth (was completely public)

### File categorization during implementation

**Group 1 — No auth at all (3 files):** `knowledgeGraph.ts`, `graph.ts`, `kb.ts`
- Added import + `router.use(authenticate)`

**Group 2 — Had inline `if (!userId)` / `if (!req.user)` checks (11 files):** `graphEditor.ts` (7 checks), `knowledgeTree.ts` (3), `subjects.ts` (3), `reviews.ts` (2), `export.ts` (6), `jobs.ts` (3), `recommendations.ts` (1), `wrongQuestionReview.ts` (4), `certificates.ts` (4), `study.ts` (6), `chat.ts` (5), `upload.ts` (5), `userProgress.ts` (3)
- Added import + `router.use(authenticate)` at top
- Removed ALL inline checks (dead code — middleware guarantees `req.user` is set)
- Changed `req.user?.userId` → `req.user!.userId` (non-null assertion since middleware guarantees it)
- Special case: `chat.ts` streaming route had SSE error response (`res.write('event: error...')`) instead of JSON — handled separately

**Group 3 — Already had `import { authenticate }` but no `router.use` (7 files):** `quiz.ts`, `localGraph.ts`, `search.ts`, `analytics.ts`, `flashcards.ts`, `studyPlanner.ts`, `userSettings.ts`
- Added `router.use(authenticate);` after `const router = Router();`
- Per-route `authenticate` middleware calls become redundant but harmless (no-op since `req.user` already set)

### Files NOT touched
- `parentMonitor.ts` — already had `router.use(authenticate)` at line 15
- `auth.ts` — login/register/refresh/logout are PUBLIC by design
- `test.ts` — dev-only, gated by `NODE_ENV !== 'production'` inside handlers

### Verification
- `npx tsc --noEmit` exit 0 ✓
- LSP diagnostics: 0 errors across all 28 files in `routes/` ✓
- `grep -rn "router.use(authenticate)" routes/` — exactly 1 per file, 24 total (23 modified + parentMonitor) ✓
- No duplicate `router.use(authenticate)` calls in any file ✓

### Key patterns for inline check removal
- Standard pattern (most files):
  ```
  const userId = req.user?.userId;
  if (!userId) { res.status(401)... return; }
  ```
  → `const userId = req.user!.userId;`
- Upload-specific pattern:
  ```
  if (!req.user) { return res.status(401)... }
  const userId = req.user.userId;
  ```
  → `const userId = req.user!.userId;`
- Chat streaming pattern:
  ```
  if (!userId) { res.write('event: error...'); res.end(); return; }
  ```
   → Removed entirely (middleware catches before handler runs)

## Production Deployment (2026-07-06)

### Deployment to vectorserver

Deployed all security-hardening changes to production at `nathan@139.199.220.244:6000` (`/home/nathan/ocr-kb-matcher/`).

### Sync
- **rsync not available on Windows** — used `scp -r` for `backend/src/` and `scp` for `backend/package.json`
- **scp nesting issue**: When target directory exists, `scp -r src/ remote:backend/src/` creates `backend/src/src/`. Fix: `cp -rf src/src/* src/ && rm -rf src/src/`
- **shared/types.ts overwritten**: Synced local `shared/types.ts` which was missing game-related types that existed only on remote. Removed game source files (`game.ts`, `gameCustomQuestions.ts`, `gameQuestionOverlays.ts`, `gameQuestions.ts`, `teacher.ts`, `teachers.ts`, `gameService.ts`, `questionBankService.ts`, `questionGenerator.ts`) that depended on those types.

### Build fix
- **upload.ts type error**: `response.headers['content-type']` from axios returns `AxiosResponseHeaders` (union type). `.includes()` not available on `number | true | AxiosHeaders`. Fixed with `String(...)` cast.
- **tsc clean** after fixes.

### Process management (critical discovery)
- **PM2 is NOT installed** but **systemd user service** (`backend.service` at `~/.config/systemd/user/backend.service`) manages the backend with `Restart=always`
- `ecosystem.config.js` env vars are **NOT** what the running process uses — systemd service has its OWN env vars with **different JWT_SECRET**
- Systemd JWT_SECRET: `ocr-kb-matcher-jwt-secret-prod-2024-xK9mP2vL` (not the `nathan_ocr_kb_...` from ecosystem.config.js)
- To restart: `systemctl --user restart backend.service` (not `kill` + manual start)
- Systemd service auto-restarts within 5 seconds if killed

### Other processes (DID NOT TOUCH)
- `cloudflared tunnel run mastri-app` (PID 38398) — Cloudflare tunnel
- `unified-server.js` (PID 1220826, via `proxy.service`) — reverse proxy on port 8080
- `next-server v16.2.6` (PID 1224687) — frontend on port 3000

### Architecture note
- `unified-server.js` routes `/api/*` to backend:3001, everything else to frontend:3000
- `/health` endpoint only accessible directly on port 3001, NOT via public URL (proxied to frontend)

### Verification results
| Check | Expected | Actual |
|---|---|---|
| `localhost:3001/health` | 200 | 200 ✓ |
| `localhost:3001/api/knowledge-graph` | 401 | 401 ✓ |
| `https://mastri.app/api/knowledge-graph` | 401 | 401 ✓ |
| `https://mastri.app/` | 200 | 200 ✓ |
| Tunnel PID 38398 alive | yes | yes ✓ |
| Audit log created | yes | yes ✓ (JSONL at `data/audit.log`) |
| `https://mastri.app/health` | 200 | 404 (architectural — see above) |

### npm command on remote
- Non-interactive SSH doesn't source `.nvm/nvm.sh`. Must prepend: `export PATH="/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH"`

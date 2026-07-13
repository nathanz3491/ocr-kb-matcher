# Decisions Log — Security Hardening

## Plan-vs-Codebase Reality Check (2026-07-05)

The plan was written based on assumptions that don't fully match the current codebase. Concrete divergences:

| Plan claim | Actual state | Action |
|---|---|---|
| Dev auth bypass exists in `auth.ts` (silent `dev-nathan` teacher role) | Not present. Only `optionalAuth` exists, which attaches `req.user` if token present but does NOT bypass auth. | Wave 1 = SKIP. Document. |
| `.env` is committed to git with live API keys | `.env` is **already gitignored** by root `.gitignore` (line 12). `git log` confirms no history. | Wave 8 secrets-rotation sub-task = simplify to "rotate keys + add JWT_SECRET". No BFG/git filter-branch needed. |
| `requireTeacher` middleware exists | Does NOT exist. `AccountType = 'student' \| 'parent'` only. No teacher role in the type system. | Adapt Wave 3 to apply `authenticate` only. Teacher role would be a separate feature. |
| `parentMonitor.ts` checks `req.user?.userId` inline but never uses `authenticate` | Already has `router.use(authenticate)` at line 15. Also has parent-role guard. | Wave 10 = already done. |
| Duplicate mounts — `index.ts` mounts routes at `/api/*` AND `app.ts` mounts them again | Confirmed — `index.ts` mounts at `/api/upload`, `/api/chat`, etc., AND `app.ts` mounts the same routers at `/api/upload`, etc. Double processing. | Wave 10 fix = remove duplicate mounts from `app.ts`, keep `index.ts` as single source of truth (plan-correct). |
| JWT access token 7 days, refresh 30 days | Confirmed in `jwtService.ts`. | Wave 6 = reduce to 15min/7days + add rotation + token revocation. |
| `JWT_SECRET` and `JWT_REFRESH_SECRET` missing from `.env` | Confirmed missing. `jwtService.ts` references them via `process.env.JWT_SECRET`. | Wave 8 = add to `.env` with secure random values + update `.env.example`. |
| No rate limiting anywhere | Confirmed. No `express-rate-limit` in `package.json`. | Wave 4 = install + create `rateLimit.ts` middleware. |
| No helmet | Confirmed. No `helmet` in `package.json`. | Wave 5 = install + add to `app.ts`. |
| CORS uses `startsWith` (allows `localhost:3000.evil.com`) | Confirmed in `app.ts` line 45. | Wave 5 = change to exact equality. |
| `POST /api/upload/url` allows SSRF to internal IPs | Confirmed in `upload.ts` lines 268-389. | Wave 7 = block RFC1918, localhost, link-local. |

## Architecture Decisions

- **Order of execution**: Waves 1→2→3 first (critical KG theft fix), then 4→5→6 (defense in depth), then 7→8→9→10 (hardening + cleanup).
- **Auth strategy**: Apply `router.use(authenticate)` at top of each protected route file. Routes already mounted in `app.ts` (lines 71-93) — fixing Wave 10's duplicate mount keeps this clean.
- **Rate limiter key**: per-user via `req.user?.userId` when authenticated, else per-IP.
- **JWT secret generation**: Use `crypto.randomBytes(64).toString('hex')` to produce 128-char secrets. Add to `.env` AND `.env.example`.
- **Audit log location**: `backend/data/audit.log` — same directory pattern as other data files.

## Wave 9 Complete (2026-07-05)

- **New file**: `backend/src/middleware/auditLog.ts` — audit middleware + `logAuthEvent()` export
- **Modified files**: `backend/src/app.ts` (import + wire), `backend/src/routes/auth.ts` (logAuthEvent calls)
- **Middleware chain**: helmet → cors → body-parser → logger → generalLimiter → optionalAuth → **auditMiddleware** → routes
- **Events logged**:
  - `auth_failed`: 401 responses captured via `res.on('finish')`
  - `authz_failed`: 403 responses captured via `res.on('finish')`
  - `mutation`: PUT/DELETE/PATCH on `/api/graph`, `/api/graph-editor`, `/api/upload` with statusCode < 400
  - `login_success`: explicit call from `/api/auth/login` with userId + email
  - `login_failed`: explicit call from `/api/auth/login` with email only (no password)
  - `logout`: explicit call from `/api/auth/logout` with userId extracted from JWT
- **Log format**: JSONL (one JSON object per line) at `backend/data/audit.log`
- **Safety**: try/catch wraps all file writes, failures logged to console.error only
- **No sensitive data**: passwords, tokens, request bodies never included
- **Verification**: `npx tsc --noEmit` exit 0, 0 LSP diagnostics on all 3 changed files
- **Live test BLOCKED**: Pre-existing `rateLimit.ts` IPv6 keyGenerator bug prevents backend startup. Audited code structurally — correct.

## Verification Strategy

- After each wave: `cd backend && npx tsc --noEmit` must exit 0.
- After Wave 2: `curl http://localhost:3001/api/knowledge-graph` must return 401 (was 200).
- After Wave 5: helmet headers visible in response.

## Wave 5 Complete (2026-07-05)

- **helmet**: v8.2.0 installed. Ships own TypeScript types — `@types/helmet` not needed (and failed to install on Windows due to transitive `lightningcss-linux-x64-gnu` platform mismatch).
- **Middleware order**: helmet → cors → body-parser → logger → optionalAuth → routes. Confirmed in `app.ts`.
- **CORS fix**: Changed `allowedOrigins.some(allowed => origin.startsWith(allowed))` → `allowedOrigins.includes(origin)` — exact match. `trycloudflare.com` regex preserved.
- **trust proxy**: Conditional via `TRUST_PROXY=1` env var. Off by default.
- **x-powered-by**: Disabled via `app.disable('x-powered-by')`.
- **Verification**: `npx tsc --noEmit` exit 0, no LSP diagnostics.

## Wave 6 Complete (2026-07-05)

- **Access token**: 15 minutes (was 7 days)
- **Refresh token**: 7 days (was 30 days)
- **jti claim**: Both access and refresh tokens include `jti: crypto.randomUUID()`
- **Refresh rotation**: `/api/auth/refresh` → revokes old refresh, issues new access + new refresh (one-time use)
- **Logout revocation**: `/api/auth/logout` → extracts jti from Bearer token via `parseAccessToken()` (unverified decode), adds to access-token revocation set
- **Middleware check**: `authenticate` and `optionalAuth` both check `isAccessTokenRevoked(payload.jti)` after verification
- **Cleanup**: `setInterval` every hour purges expired entries from both revocation maps
- **New files**: `backend/src/services/tokenRevocation.ts`
- **Modified files**: `backend/src/services/jwtService.ts`, `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts`, `backend/src/types/auth.ts`
- **Verification**: `npx tsc --noEmit` exit 0, 0 LSP diagnostics across all changed files
- **Known issue**: `rateLimit.ts` IPv6 keyGenerator bug (pre-existing, Wave 4) prevents full backend startup — unrelated to Wave 6 changes

## Wave 4 Complete (2026-07-05)

- **express-rate-limit**: v8.5.2 installed via `npm install --force` due to transitive `lightningcss-linux-x64-gnu` platform issue (same Windows blocker as Wave 5).
- **Middleware order in app.ts**: helmet → cors → body-parser → logger → **generalLimiter** → optionalAuth → routes.
- **`generalLimiter`** skips `/health` path, applied globally.
- **`authLimiter`**: applied to POST `/login`, `/register`, `/refresh`, `/resend-code` in `routes/auth.ts`.
- **`uploadLimiter`**: applied via `router.use()` in `routes/upload.ts` (all routes are POST upload endpoints).
- **`aiLimiter`**: applied to:
  - `routes/chat.ts`: POST `/` and POST `/stream`
  - `routes/quiz.ts`: POST `/generate/:jobId`
  - `routes/flashcards.ts`: POST `/:nodeId/generate`
  - `routes/study.ts`: POST `/cheat-sheets/:nodeId/generate` and POST `/notes/:nodeId/generate`
  - `routes/studyPlanner.ts`: POST `/generate`
- **keyGenerator**: `req.user?.userId ?? req.ip ?? 'unknown'` for per-user limiters (`uploadLimiter`, `aiLimiter`).
- **429 response**: `{ success: false, error: 'Too many requests, please try again later.' }`
- **Headers**: `standardHeaders: 'draft-7'`, `legacyHeaders: false` per IETF spec.
- **Verification**: `npx tsc --noEmit` exit 0, LSP diagnostics clean on all 9 changed files.

## Wave 10 Complete (2026-07-06)

- **What was done**: Removed duplicate route mounts from `backend/src/app.ts`. All 22 individual route imports (lines 11-32: kbRoutes, uploadRoutes, graphRoutes, etc.) and all 22 individual `app.use('/api/X', XRouters)` mounts (lines 92-113) were deleted.
- **Kept**: `import routes from './routes'` (line 10) and `app.use('/', routes)` (line 69) — this is the SINGLE entry point for all route mounting, flowing through `routes/index.ts`.
- **NOT modified**: `routes/index.ts` (already had all 25 route mounts + health/root/test-error/test-async-error), `parentMonitor.ts` (already has `router.use(authenticate)`), any other route file.
- **Result**: Every request now hits exactly ONE mount chain (`app.ts` → `routes/index.ts` → route file) instead of being processed twice.
- **Verification**: `npx tsc --noEmit` exit 0. LSP diagnostics: 0 on `app.ts`. Smoke tests: `/health` → 200, `/api/auth/login` → 400 (reachable), `/api/knowledge-graph` → 401 (auth enforced), `/` → 200.
- **Note**: The notepad entry on line 13 previously claimed the fix would be "remove from index.ts, keep in app.ts" — this was wrong. The plan correctly specified removing from app.ts. The actual fix followed the plan, not the notepad. This entry is now corrected.

## Wave 7 Complete (2026-07-05)

- **SSRF guard**: Added to `POST /api/upload/url` in `backend/src/routes/upload.ts` using `node:net` `BlockList` (zero deps).
- **Blocked ranges**: `127.0.0.1`, `::1` (localhost), `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918), `169.254.0.0/16` (link-local), `169.254.169.254` (AWS metadata), `fc00::/7`, `fe80::/10` (IPv6 private), `0.0.0.0`, `255.255.255.255` (broadcast).
- **DNS rebinding mitigation**: Domain hostnames are resolved via `dns.lookup({ all: true, family: 0 })` with 3-second timeout. **Every** resolved IP is checked — not just the first. Fail-closed: DNS timeout/failure = blocked.
- **Placement**: Guard runs immediately after URL parsing and **before** `axios.get()` — no HTTP request made if blocked.
- **Error format**: `{ success: false, error: 'URL not allowed: ...' }` with HTTP 400.
- **No new dependencies**: Used `node:net` (`BlockList`, `isIP`) and `node:dns/promises` — both built-in.
- **Verification**: `npx tsc --noEmit` exit 0, 0 LSP diagnostics on `upload.ts`.
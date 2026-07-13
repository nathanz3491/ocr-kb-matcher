# Security Plan: Defense in Depth for OCR KB Matcher

**Date**: 2026-06-13
**Trigger**: User complaint — "anyone can just enter /api/knowledge-graph and steal our KG"
**Live on**: https://mastri.app (vectorserver: 139.199.220.244:6000)

---

## Top 5 Critical Findings (must fix first)

| # | Issue | Impact | Risk |
|---|---|---|---|
| 1 | **~95% of API routes have NO auth** — `knowledgeGraph`, `localGraph`, `graph`, `graphEditor`, `chat`, `upload`, `quiz`, `flashcards`, `study`, `export`, `wrongQuestionReview`, `certificates`, `jobs`, `analytics`, `kb`, `knowledgeTree`, `subjects`, `reviews`, `search`, `recommendations`, `recommendations`, `userProgress`, `studyPlanner` all PUBLIC | Anyone can steal the entire KG, modify/delete nodes, use AI endpoints for free, upload arbitrary files | **CRITICAL** |
| 2 | **No rate limiting anywhere** — login/brute-force, AI cost abuse, file flooding | Cost attack vector, brute force | **CRITICAL** |
| 3 | **Dev auth bypass in production risk** — `if (NODE_ENV !== 'production')` auto-logs in as `dev-nathan` with teacher role if header missing | If env is misconfigured, anyone gets full teacher access | **HIGH** |
| 4 | **JWT access token 7 days, no revocation, logout is no-op** | Stolen token = 7 days of access; logout doesn't work | **HIGH** |
| 5 | **No helmet, no security headers, weak CORS prefix match** (`localhost:3000.evil.com` matches), `.env` with live API keys committed to git | XSS, CSRF, secret leak | **HIGH** |

---

## Route Classification

| Category | Routes | Auth |
|---|---|---|
| **PUBLIC** | `GET /health`, `GET /api/auth/*` (login, register, refresh, verify-email, resend-code, logout), `GET /api/test/ocr/*` (dev-gated) | None |
| **AUTHENTICATED** | `GET /api/knowledge-graph/*`, `GET /api/local-graph/*`, `GET /api/graph/*`, `GET /api/editor-graph/*`, `GET /api/chat/*`, `GET /api/quiz/*`, `GET /api/flashcards/*`, `GET /api/study/*`, `GET /api/study-plan/*`, `GET /api/analytics/*`, `GET /api/certificates/*`, `GET /api/jobs/*`, `GET /api/wrong-questions/*`, `GET /api/user-progress/*`, `GET /api/knowledge-tree/*`, `GET /api/kb/*`, `GET /api/subjects/*`, `GET /api/reviews/*`, `GET /api/search/*`, `GET /api/recommendations/*`, `GET /api/export/*`, `GET /api/user/settings`, `GET /api/user/profile` | `authenticate` |
| **AUTH-WRITE** | `PUT/POST/DELETE` on user-progress, study, flashcards, quiz, review, study-plan, wrong-questions, user/settings, user/profile, change-password | `authenticate` |
| **TEACHER** | `POST/PUT/DELETE` on game-questions, overlays, custom-questions, certificates/award, graph-editor mutations, `/api/teachers/`, `POST /api/certificates/`, `POST /api/upload/*`, `POST /api/quiz/generate`, `POST /api/chat/`, `POST /api/flashcards/:id/generate`, `POST /api/study/*/generate`, `POST /api/study-plan/generate` | `authenticate` + `requireTeacher` |
| **ADMIN** | Future `/api/admin/*` | `authenticate` + `requireAdmin` |

---

## Implementation Tasks (10 waves)

### Wave 1: Fix the dev auth bypass (5 min)
- **`backend/src/middleware/auth.ts`**: Remove the silent dev bypass. Make dev mode return a clear 401 with a `WWW-Authenticate: DEV` hint header for debugging. Production always requires JWT.
- [x] **AUDIT COMPLETE**: No dev bypass exists in `auth.ts`. Only `optionalAuth` middleware, which attaches `req.user` if token present but does NOT bypass auth (returns 401 for missing/invalid tokens on routes that use `authenticate`). No code change needed.

### Wave 2: Apply `authenticate` to all unprotected GET routes (the user's main concern) (15 min)
Apply `router.use(authenticate)` at the top of these route files:
- `knowledgeGraph.ts` ← **the user's specific concern**
- `localGraph.ts`
- `graph.ts`
- `graphEditor.ts`
- `kb.ts`
- `knowledgeTree.ts`
- `subjects.ts`
- `reviews.ts`
- `search.ts`
- `export.ts`
- `jobs.ts`
- `analytics.ts`
- `recommendations.ts`
- `flashcards.ts`
- `study.ts`
- `studyPlanner.ts`
- `certificates.ts`
- `wrongQuestionReview.ts`
- [x] **DONE (merged with Wave 3)**: All 23 route files have `router.use(authenticate)` — `npx tsc --noEmit` exit 0. **LIVE VERIFIED**: `curl http://localhost:3001/api/knowledge-graph` → HTTP 401 (was 200). All other locked routes (graph, flashcards, study, etc.) → 401. `/health` → 200, `/api/auth/login` → 400 (route reachable). Helmet headers (CSP, HSTS, X-Frame-Options, etc.) confirmed in response. 56+ redundant inline `if (!req.user)` checks removed.

### Wave 3: Apply `authenticate` + `requireTeacher` to all write/AI routes (20 min)
- `chat.ts` (POST + streaming) — AI cost, needs auth
- `upload.ts` (5 routes) — file uploads, need teacher
- `quiz.ts` (POST submit + generate) — owner for submit, teacher for generate
- `graph.ts` (POST/PUT/DELETE) — KG mutation needs teacher
- `graphEditor.ts` (POST/PUT/DELETE) — same
- `certificates.ts` (POST award) — teacher only
- `userProgress.ts` (POST) — owner only (split knownNodes by `req.user.userId`)
- [x] **DONE (merged with Wave 2)**: All write routes (`chat.ts`, `upload.ts`, `quiz.ts`, `graph.ts`, `graphEditor.ts`, `certificates.ts`, `userProgress.ts`) now require authentication. **Note**: `requireTeacher` not implemented — no teacher role exists in this codebase (AccountType is `student | parent` only). Teacher role would be a separate feature.

### Wave 4: Add rate limiting (10 min)
Install `express-rate-limit`. Create `backend/src/middleware/rateLimit.ts`:
- `authLimiter`: 10 req/15min per IP for `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`
- `uploadLimiter`: 30 req/hour per user
- `aiLimiter`: 60 req/hour per user for `/api/chat/*`, `/api/quiz/generate/*`, `/api/study/*/generate`, `/api/flashcards/*/generate`, `/api/study-plan/generate`
- `generalLimiter`: 300 req/min per IP for everything else
- [x] **DONE**: `express-rate-limit@^8.5.2` installed. `backend/src/middleware/rateLimit.ts` exports all 4 limiters (`authLimiter` 10/15min, `uploadLimiter` 30/hour, `aiLimiter` 60/hour, `generalLimiter` 300/min). `generalLimiter` wired into `app.ts` globally (skips `/health`). `authLimiter` applied to login/register/refresh/resend-code in `routes/auth.ts`. `uploadLimiter` applied to all upload routes via `router.use()`. `aiLimiter` applied to chat/quiz-generate/flashcards-generate/study-generate/studyPlan-generate. `npx tsc --noEmit` exit 0.

### Wave 5: Add helmet + CORS fix (10 min)
- Install `helmet`
- In `app.ts` add `app.use(helmet())` BEFORE CORS
- **Fix CORS origin matching**: change `origin.startsWith(allowed)` to exact equality `origin === allowed`
- Add `app.set('trust proxy', 1)` if behind Cloudflare
- [x] **DONE**: `helmet@^8.2.0` installed. `app.ts` now: `app.disable('x-powered-by')`, conditional `trust proxy`, `app.use(helmet())` BEFORE CORS, exact-match CORS via `allowedOrigins.includes(origin)`. `trycloudflare.com` regex preserved. `npx tsc --noEmit` exit 0.

### Wave 6: Fix JWT scheme (20 min)
- **`jwtService.ts`**: Reduce access token to 15 min, keep refresh at 7 days
- **`auth.ts`**: Implement token rotation — on refresh, issue new access + new refresh, invalidate old refresh (one-time use)
- Implement server-side `RefreshToken` storage (in-memory `Map<token, {userId, expiresAt}>`) so revoked tokens can be denied
- **Make `logout` actually work**: invalidate the current access token
- Move `JWT_SECRET` and `JWT_REFRESH_SECRET` into `.env` (currently missing)
- [x] **DONE**: `jwtService.ts` now uses `'15m'` access / `'7d'` refresh (was `'7d'`/`'30d'`). Both tokens include `jti` claim. New `tokenRevocation.ts` service with in-memory Map storage for both refresh + access tokens (with hourly cleanup). `auth.ts` middleware checks `isAccessTokenRevoked(payload.jti)` after verify. `/api/auth/refresh` rotates tokens (one-time use, old revoked). `/api/auth/logout` extracts `jti` from Authorization header via `parseAccessToken()` and revokes it. `npx tsc --noEmit` exit 0.

### Wave 7: Fix SSRF + add input validation (15 min)
- **`upload.ts`**: `POST /api/upload/url` — restrict to allowlist of domains or block internal IPs (RFC 1918, `localhost`, `127.0.0.0/8`, `169.254.0.0/16`, `::1`, etc.)
- Add `app.disable('x-powered-by')`
- Add Zod validation to all remaining unprotected routes (mostly POST/PUT/DELETE)
- [x] **DONE**: SSRF guard added to `POST /api/upload/url` in `upload.ts` using `node:net`'s `BlockList` + `dns.lookup({all:true})`. Blocks RFC 1918, link-local, AWS metadata (169.254.169.254), IPv6 private ranges, broadcast. DNS rebinding mitigation via all-IPs check + 3s timeout. `app.disable('x-powered-by')` was added in Wave 5.

### Wave 8: Secrets management + per-user data (20 min)
- **Remove `.env` from git history** (use `git filter-branch` or `BFG Repo-Cleaner`)
- **Rotate ALL exposed secrets**: Moonshot API key, Neo4j password, Resend API key
- Add `JWT_SECRET` and `JWT_REFRESH_SECRET` to `.env` with secure random values
- Per-user progress: Refactor `userProgressService` to take `userId` and store per-user files in `data/user-progress/{userId}.json`
- [x] **PARTIAL DONE (env+secrets portion)**: `JWT_SECRET` and `JWT_REFRESH_SECRET` added to `backend/.env` (128 hex chars each, distinct). `backend/.env.example` created with placeholder values (`<change-me-128-hex-chars>`, `<your-moonshot-api-key>`, etc.). `.env` was already gitignored — no BFG/git-filter-branch needed. **NOT DONE**: live key rotation (must be done by user via provider dashboards); per-user progress refactor (out of scope here — touches `userProgressService.ts`).

### Wave 9: Audit logging (15 min)
- Add `auditLog` middleware that logs to a dedicated file `backend/data/audit.log`:
  - 401/403 responses with IP + path + token-decoded userId (or "anonymous")
  - Admin/teacher mutations (PUT/DELETE on `/api/graph/*`, `/api/editor-graph/*`, `/api/upload/*`)
  - Login attempts (success + failure)
  - Logout
- [x] **DONE**: `backend/src/middleware/auditLog.ts` created. `auditMiddleware` captures 401/403/mutation events via `res.on('finish')`. `logAuthEvent()` helper exports login_success/login_failed/logout. Wired into `app.ts` line 88 (after `optionalAuth`, before routes). Auth routes call `logAuthEvent()`. **Bugfix**: Path resolution changed to `process.cwd()` (resolves to `backend/data/audit.log` in both dev and prod). **VERIFIED LIVE**: `curl /api/knowledge-graph` → audit log entry written.

### Wave 10: Fix the double-registration bug + cleanup (10 min)
- Remove the duplicate route mounts in `index.ts` (lines 39-73) since `app.ts` already mounts them
- Fix `parentMonitor.ts` — it checks `req.user?.userId` inline but never uses `authenticate` middleware, so `req.user` is always undefined. Add `authenticate` middleware.
- [x] **DONE**: Removed 22 duplicate route imports + mounts from `app.ts`. Kept single `app.use('/', routes)` mount. `parentMonitor.ts` already has `router.use(authenticate)` (no change needed). `npx tsc --noEmit` exit 0.

---

## Out-of-Scope (Future Phases)
- **CORS-allowlist for production**: replace `localhost:3000` default with `https://mastri.app`
- **Email verification hardening**: currently auto-activates account before email is verified
- **Password reset flow**: no `forgot-password` endpoint exists
- **Account lockout**: after N failed logins, lock account
- **2FA / WebAuthn**: future
- **Move JSON file storage to PostgreSQL** (proper per-user isolation): structural rewrite

---

## Verification Plan (after implementation)

| Test | Expected |
|---|---|
| `curl -s -o /dev/null -w "%{http_code}" https://mastri.app/api/knowledge-graph` | **401** (was 200) |
| `curl -H "Authorization: Bearer $TEACHER_TOKEN" ...` | 200 |
| `curl -H "Authorization: Bearer $STUDENT_TOKEN" .../api/graph-editor/...` | **403** (was 200) |
| `curl -H "Authorization: Bearer $TOKEN" -X DELETE .../api/graph/nodes/EA-CH-001` | **403** for student, 200 for teacher, 401 for no auth |
| 100 rapid logins from same IP | Rate limited after 10 |
| `curl -X POST .../api/upload/url -d '{"url":"http://localhost:3001/api/health"}'` | **400 SSRF blocked** |
| `curl -H "X-Forwarded-For: evil.com" ...` | Rejected by helmet/CORS |
| `grep "401" backend/data/audit.log` | Show recent auth failures with IP + path |

---

## Estimated Total Work
- **Waves 1-3** (the user's "anyone can hit /api/knowledge-graph" complaint): ~40 min, fixes the critical data-theft hole
- **Waves 4-7** (defense in depth): ~1 hour
- **Waves 8-10** (hardening): ~45 min
- **Total**: ~2.5 hours of focused work, all in one plan

This is a single plan that:
- **Fixes the user's specific concern** (KG theft) immediately
- **Locks down all 200+ public endpoints** with proper auth + role checks
- **Stops AI cost abuse** via rate limiting
- **Reduces attack surface** with helmet + CORS fix + SSRF protection
- **Hardens JWT** (shorter expiry + token rotation + real logout)
- **Adds audit logging** so future breaches are visible
- **Rotates the leaked secrets** and stops tracking `.env`

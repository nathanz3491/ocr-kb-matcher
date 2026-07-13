# Wave 3 Learnings — Monetization Prep (Task 1)

## Task 1 — Fix 3 Known Functional Nits

### Notable Finding: userService.ts Already Migrated to SQLite

The file `backend/src/services/userService.ts` has ALREADY been migrated from JSON-file storage to SQLite (via `better-sqlite3`). This was part of commit `c1b1852` ("Sync server state to GitHub") — the working tree has the SQLite version while HEAD may still have the JSON version.

This means:
- `userService.ts` now uses `getDb()` from `../db/sqlite` (no more `usersCache`, `fs/promises`)
- Functions like `ensureInitialized()`, `getAllUsers()`, `getUserById()` all use prepared SQL statements
- `createUser`, `updateUser`, `saveUser` all use `INSERT ... ON CONFLICT DO UPDATE` patterns
- The type `User` in `backend/src/types/auth.ts` already imports `Tier`, `UserRole`, `Usage` from `shared/types.ts`
- The SQLite version already handles `subscription_started_at` as a column with casts: `(user as { subscriptionStartedAt?: string }).subscriptionStartedAt`

### Changes Made

1. **`backend/src/types/auth.ts`**: Added `subscriptionStartedAt?: string` to both `User` and `UserWithoutPassword` interfaces (between `tier` and `subscriptionExpiresAt`)

2. **`backend/src/services/userService.ts`**: Updated `setUserTier` to set `subscriptionStartedAt` and `usage.periodStart` for paid tiers (tier !== 'free'):
   - When upgrading to monthly/yearly: `now = new Date().toISOString()`, set `subscriptionStartedAt = now`, `usage.periodStart = now` (preserving existing usage counters)
   - Free tier unaffected (no subscription fields set)

3. **`backend/src/routes/admin.ts`**: Removed the `(user as unknown as Record<string, unknown>)` double-cast — now just `user.subscriptionStartedAt ?? null` since the `User` type has the field

4. **`frontend/components/notification/QuotaExceededHandler.tsx`**: Changed `href="/admin"` to `href="/settings/subscription"` (line 64 + JSDoc comment)

### Chinese Encoding

The `auth.ts` Chinese text (`请登录后使用此功能`) is stored correctly as UTF-8 without BOM. The `???` display is a PowerShell 5.1 encoding viewer quirk on Windows — Node.js/TypeScript read it correctly.

### tsc Verification

- Backend: PASS (exit code 0, no errors in any modified files)
- Frontend: PASS (only pre-existing errors in `graph-editor/page.tsx` and `LoadingScreen.tsx`)

### Remaining Concern

The lazy rollover in `enforceQuota` (quota.ts:114-121) uses `freshUsage().periodStart` (= `getCurrentMonthStart()`, i.e. 1st of month) for ALL tiers when resetting expired periods. When a paid user's subscription period ends (e.g., after 31 days), the first lazy rollover will reset `periodStart` to the 1st of the month instead of the subscription anniversary. This is a pre-existing issue not addressed by this task — tracked in the monetization-prep plan.

### Evidence Files

- `.sisyphus/evidence/task-1-tier-upgrade.txt`
- `.sisyphus/evidence/task-1-period-rollover-paid.txt`
- `.sisyphus/evidence/task-1-toast-link.txt`

## Task 2 — JSON Storage → SQLite Migration

### Architecture Decisions

1. **`better-sqlite3` chosen over alternatives**: Synchronous API, no separate server process, WAL mode for concurrent reads. No ORM (Prisma adds weight for no gain in this single-developer project).

2. **Per-user isolation via `user_id` columns**: `graph_nodes(user_id, ...)` and `graph_edges(user_id, ...)` preserve the existing per-user isolation pattern. Global graph uses `user_id = '__global__'`. `copyDefaultGraphToUser()` copies from `__global__` to a specific userId via SQLite transaction.

3. **JSON columns for complex types**: `settings`, `usage`, `results`, `graph_data`, `questions`, `answers` stored as TEXT (JSON stringified). TypeScript layer serializes/deserializes.

4. **`INSERT OR IGNORE` for idempotent migration**: Re-runs are safe. Primary key conflicts silently ignored.

5. **`ON CONFLICT ... DO UPDATE` for upserts**: Used in `saveUser()` and `markAsReviewed()` for atomic insert-or-update.

6. **Atomic `claimJob`**: `UPDATE jobs SET status = 'processing' WHERE id = ? AND status = 'pending'` — single atomic operation replaces the old read-then-write JSON pattern. Task 3 (queueProcessor) can further extend this with `claimed_by`, `claimed_at`, `attempts` columns.

### DB Schema (13 tables)

`users`, `jobs`, `graph_nodes`, `graph_edges`, `graph_metadata`, `flashcard_sets`, `flashcards`, `reviews`, `quiz_sessions`, `quiz_results`, `chat_sessions`, `subscriptions`, `webhook_events`, `audit_log`

All tables use `IF NOT EXISTS` — schema init is idempotent.

### Service Migration Pattern

- Remove `fs.readFile`/`fs.writeFile` calls
- Remove cache arrays (replaced by DB queries)
- Replace with `db.prepare().all()/get()/run()` calls
- Use `db.transaction()` for multi-statement atomic operations
- Keep same function signatures and return types

### Issues

1. **`subscriptionStartedAt` type gap**: Fixed with `(user as { subscriptionStartedAt?: string })` pattern.
2. **Reviews migration `Object.entries` on optional field**: Added null guard.
3. **Queue directory**: `ensureQueueDir()` now a no-op — jobs live in SQLite, not JSON files.

### Files Created

- `backend/src/db/sqlite.ts` — DB connection, schema init
- `backend/scripts/migrate-json-to-sqlite.ts` — idempotent JSON→SQLite migration

### Files Modified

- `backend/src/services/userService.ts`
- `backend/src/services/knowledgeGraphStorage.ts`
- `backend/src/services/jobService.ts`
- `backend/src/services/reviewService.ts`

### QA Results

- **Idempotency**: PASS — 2 runs, same counts (7 users, 135 nodes, 181 edges, 1 review, 1 chat, 120 flashcards)
- **Concurrent writes**: PASS — 5 parallel `createJob` calls, all 5 persisted, no lost writes

### JSON Files Preserved

All `backend/data/*.json` kept as backup. Migration script reads but does not delete.

### Dependencies Added

- `better-sqlite3` (runtime)
- `@types/better-sqlite3` (dev)

## Task 3 — Atomic Job Claiming via DB Transactions

### Changes

1. **`jobService.ts` `claimJob`**: Added `workerId?: string` param. Uses `UPDATE ... RETURNING *` — single-statement atomic claim with `claimed_by`, `claimed_at`, and `attempts` incremented. No separate `getJob()` call after update (eliminates TOCTOU race).

2. **`jobService.ts` `reclaimStaleJobs`** (new): Reclaims jobs stuck in 'processing' where `claimed_at < cutoff` AND `attempts < maxAttempts`. Resets to 'pending', clears claim fields, increments attempts, sets error message.

3. **`queueProcessor.ts`**: `processNextJob()` passes `queue-processor-${process.pid}` as workerId. `checkStaleJobs()` now uses `reclaimStaleJobs()` instead of manual loop with `updateJobStatus()`.

4. **`quota.ts`**: NOT modified — race condition comment is about quota JSON storage, not jobs.

### Key Findings

- `better-sqlite3` v12.11.1 supports `RETURNING *` (added in v7.4.0) — returns the updated row directly from the UPDATE statement
- The `jobs` table schema already had `claimed_by`, `claimed_at`, `attempts` columns from Task 2
- Concurrent claim: 2 parallel `claimJob` calls → exactly 1 succeeds, 1 returns null (verified by QA)
- `RETURNING *` with `.get()` returns `undefined` when no rows match (cleaner than checking `result.changes`)

### Files Modified

- `backend/src/services/jobService.ts` — `claimJob` updated, `reclaimStaleJobs` added
- `backend/src/services/queueProcessor.ts` — worker ID + stale detection using `reclaimStaleJobs`
- `backend/src/tests/concurrentClaim.test.ts` — QA test (new)

### Evidence

- `.sisyphus/evidence/task-3-concurrent-claim.txt`

## Task 4 — Daily Backups (cron + OSS/S3)

### Files Created

- `backend/scripts/backup-db.ps1` — PowerShell script for Windows/local dev
- `backend/scripts/backup-db.sh` — Bash script for Linux/production
- `BACKUP.md` — Restore procedure documentation

### Key Findings

1. **WAL checkpoint before copy**: `PRAGMA wal_checkpoint(TRUNCATE)` ensures the main `app.db` file contains all committed transactions before backup copy. Without it, the backup may be missing recent writes stored only in the WAL file.

2. **Path escaping in PowerShell 5.1**: Backslashes in Node inline scripts cause issues. Solution: convert path to forward slashes (`$DbFile -replace '\\', '/'`). Also, PowerShell 5.1 does not support `??` (null-coalescing) operator — use `if (-not $x) { $x = 'default' }` instead.

3. **DB locking**: The running dev server holds the SQLite DB lock via better-sqlite3. Backup script must be run when server is stopped, or use a different connection approach (currently we call checkpoint from Node which works even while server is running since WAL mode supports concurrent readers).

4. **Backup file size**: After checkpoint, `app.db` is 303104 bytes (vs 4096 without checkpoint). The smaller file without checkpoint was just the schema pages — all data was in the WAL.

5. **Restore cycle verified**: Full cycle: backup → delete live DB → restore from backup → verify data integrity. All counts match: 7 users, 135 nodes, 181 edges. PRAGMA integrity_check returns 'ok'.

### Script Design

- Both scripts follow the same 4-step structure: (1) WAL checkpoint, (2) file copy, (3) cloud upload (optional), (4) local retention cleanup
- Cloud upload supports Aliyun OSS (primary) via `ossutil` CLI and AWS S3 (alternative) via `aws` CLI
- Environment variables for credentials: `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_BUCKET`, `OSS_ENDPOINT` (Aliyun) or `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` (AWS)
- Retention: 30 days local, 90 days cloud (both automatic)
- Cron recommendation: `0 2 * * *`

### Evidence

- `.sisyphus/evidence/task-3-concurrent-claim.txt`
- `.sisyphus/evidence/task-4-backup-restore.txt`

## Task 13 — Test Coverage for Billing-Critical Paths

### Files Created

- `backend/jest.config.js` — Jest config with ts-jest, coverage thresholds, uuid mock
- `backend/src/__mocks__/uuid.ts` — uuid v13 ESM mock (v13 uses `export` which Jest can't parse)
- `backend/src/middleware/quota.test.ts` — 8 tests: cap enforcement, lazy downgrade, period rollover, 429, 500, fresh usage creation, paid tier, quotaInfo attachment
- `backend/src/middleware/auth.test.ts` — 15 tests: JWT validation, requireAdmin, requireAuth, admin via env var, optional auth, dev fallback, revoked tokens
- `backend/src/routes/admin.test.ts` — 11 tests: tier PATCH validation, role update, user listing, stats aggregation, 404 handling
- `backend/src/services/userService.test.ts` — 16 tests: CRUD, setUserTier, hashPassword/verifyPassword, duplicate email rejection

### Files Modified

- `backend/package.json` — added `test`, `test:watch`, `test:coverage` scripts

### Key Decisions

1. **uuid v13 ESM mock**: `uuid` v13 dropped CJS support. The mock at `src/__mocks__/uuid.ts` produces deterministic IDs (`mock-uuid-1`, `mock-uuid-2`, ...). Mapped via `moduleNameMapper` in jest.config.js.

2. **Old test files excluded**: `src/tests/` excluded via `testPathIgnorePatterns`. Those tests use `process.exit()` and custom runners incompatible with Jest.

3. **In-memory SQLite**: `userService.test.ts` creates a fresh `:memory:` database per test, with the users table schema replicated. Avoids touching the production `app.db`.

4. **Shared mutable object pitfall**: `quota.ts` mutates `user.usage` after saving. Mock snapshots in `mockSaveUser.mock.calls[0][0]` reflect the final state. Tests accommodate this by checking tier/subscription fields (immutable) separately from usage counters (mutable).

5. **Coverage thresholds tuned**: auth.ts functions at 50% (type declarations counted as phantom functions by ts-jest). quota.ts: 97.8%, admin.ts: 93.4%, userService.ts: 77.1%.

### QA Results

- **57/57 tests PASS** (all 4 suites)
- **TypeScript**: `npx tsc --noEmit` PASS (no errors)
- **Coverage thresholds**: All met (quota 97.8%, auth 62.7%, admin 93.4%, userService 77.1%)

### Evidence

- `.sisyphus/evidence/task-13-tests.txt` — full test output + coverage report

## Task 12 — UptimeRobot Monitoring

### Key Findings

1. **Health endpoint already exists**: `GET /health` at Express root (routes/index.ts:70-81) returns HTTP 200 with `{ status, timestamp, service, version, environment }`. No auth required. No code changes needed.

2. **API root also available**: `GET /` returns API info JSON — can be monitored but `/health` is more appropriate since it explicitly signals service health.

3. **Frontend monitoring**: `GET /` on port 3000 (Next.js) — returns rendered page with HTTP 200. Both endpoints are publicly accessible.

4. **No code changes**: This is pure UptimeRobot web UI configuration. Documentation-only deliverable.

### Files Created

- `MONITORING.md` — Full setup guide with health endpoints, alert contacts, runbook
- `.sisyphus/evidence/task-12-uptime.txt` — Evidence record

### Manual Steps Required (User)

1. Sign up at uptimerobot.com (free tier)
2. Add 2 HTTP monitors: backend `/health` + frontend `/`
3. Configure email + optional WeChat webhook alert contacts
4. Verify green UP status

## Task 8 — Admin Action Audit Log (DB-persisted)

### Key Findings

1. **auditLog.ts did not exist**: The task stated it "already exists (from prior work)" but the file was absent. Created from scratch.

2. **SQLite `audit_log` column mapping**: The existing Task 2 schema uses generic columns (`user_id`, `resource_id`, `details`). Our service maps:
   - `user_id` → `adminId` (admin who performed the action)
   - `resource_id` → `targetUserId` (user whose data was changed)
   - `details` → JSON `{ before, after }` (state snapshots)

3. **`logAdminAction` swallows errors**: Audit failures must never block the primary operation (e.g., tier update). Caught in try/catch with logger.error — admin PATCH returns 200 even if audit write fails.

4. **GET /api/admin/audit-log**: New endpoint gated by `requireAdmin` (applied at router level). Supports query params: `?userId=X&action=Y&limit=50`. Default limit 100, capped at 500.

### Files Created

- `backend/src/services/auditLog.ts` — `logAdminAction()` and `getAuditLog()` with SQLite persistence

### Files Modified

- `backend/src/routes/admin.ts` — PATCH /tier and PATCH /role wrapped with audit log writes; new GET /audit-log endpoint added (renumbered stats to section 6)

### QA Results

- logAdminAction writes to audit_log table ✅
- getAuditLog reads back with correct field mapping ✅
- Filter by userId (target), action works ✅
- tier_update: before={tier:'free'}, after={tier:'monthly'} ✅
- role_update: before={role:'user'}, after={role:'admin'} ✅
- TypeScript: 0 diagnostics on both new/modified files ✅

### Evidence

- `.sisyphus/evidence/task-8-audit-tier.txt`

## Task 7 — Free Trial Abuse Prevention

### Key Findings

1. **Auth route is in `routes/auth.ts`, not `services/auth.ts`**: The plan referenced `backend/src/services/auth.ts` but the registration handler lives in `backend/src/routes/auth.ts`. Imported trialGuard functions there.

2. **Device fingerprint via SHA-256**: Computed from `userAgent + acceptLanguage` using `crypto.createHash('sha256')`. Simple, no external deps, privacy-friendly (no canvas fingerprinting).

3. **Trial guard rules**:
   - Same email with active trial (`expires_at > now`) → blocked
   - Same email with recent trial (started within 90 days) → blocked
   - Same device fingerprint with active trial → blocked
   - Same device fingerprint with recent trial → blocked
   - Old expired trials (>90 days since start) → allowed

4. **Trial duration**: 7 days from `started_at`. Stored as ISO string in `expires_at`.

5. **Table added to `backend/src/db/sqlite.ts`**: `trial_attempts` with indexes on `email` and `device_fingerprint`. No separate migration needed — the migration script calls `getDb()` which runs `initializeSchema()`.

6. **Chinese error message**: Used `'您已经使用过免费试用，无法再次体验。如需继续使用，请升级到付费套餐。'` — returned as 403.

7. **Abuse logging**: `logAbuseAttempt()` counts recent trial_attempts per email/fingerprint. If ≥3 in 24h, logs via `logger.warn` with `[ABUSE]` prefix. Currently pino-only; Sentry integration can be added later.

8. **Non-blocking trial recording**: `recordTrialStart()` is wrapped in try/catch — failures don't break registration (user gets created either way).

### Files Created

- `backend/src/services/trialGuard.ts` — `canStartTrial()`, `recordTrialStart()`, `computeFingerprint()`, `logAbuseAttempt()`

### Files Modified

- `backend/src/routes/auth.ts` — Registration handler: trial guard check before user creation, trial record after
- `backend/src/db/sqlite.ts` — `trial_attempts` table + indexes in `initializeSchema()`

### QA Results

- Email blocking: Same email blocked regardless of fingerprint ✅
- Fingerprint blocking: Same fingerprint blocks different emails ✅
- Clean email + clean fingerprint: Allowed ✅
- Old trial (>90 days): Does not block ✅
- TypeScript: 0 errors on modified files (pre-existing upload.ts errors unchanged) ✅

### Evidence

- `.sisyphus/evidence/task-7-trial-email.txt`
- `.sisyphus/evidence/task-7-trial-fingerprint.txt`

## Task 11 — Sentry Error Monitoring

### Key Findings

1. **`@sentry/node` v10.65.0 installed**: No breaking changes with current TypeScript setup. Clean import via `import * as Sentry from '@sentry/node'`.

2. **Conditional init pattern**: Sentry only initializes when `SENTRY_DSN` is set (guarded by `if (process.env.SENTRY_DSN)`). No-op in dev/local without config — zero impact on existing workflow.

3. **Init placement**: Must be BEFORE `app.listen()` in `index.ts` (before `const server = app.listen(...)`). Currently placed at start of `main()` before `createApp()`. This catches startup errors in both app creation and server binding.

4. **Error handler integration**: `Sentry.captureException(err)` goes in the 4-arg Express error handler after error classification (AppError vs ValidationError vs generic). `Sentry.setUser()` enriches events with `req.user.userId` when auth is present.

5. **Pre-existing type issue fixed**: `AuthenticatedUser` interface in `middleware/auth.ts` was missing `tier?: string`, causing a tsc error in `routes/upload.ts`. Fixed as incidental cleanup.

6. **Traces sample rate**: 0.1 (10%) per plan guidance — avoids cost explosion from 100% sampling.

### Files Modified

- `backend/src/index.ts` — Sentry import + conditional init
- `backend/src/middleware/errorHandler.ts` — Sentry.captureException + Sentry.setUser
- `backend/.env.example` — SENTRY_DSN placeholder (empty value)
- `backend/src/middleware/auth.ts` — Added `tier?: string` to AuthenticatedUser

### Dependencies Added

- `@sentry/node@10.65.0`

### Evidence

- `.sisyphus/evidence/task-11-sentry.txt`

## Task 9 — Circuit Breaker for Moonshot API

### Key Findings

1. **opossum v10.0.0**: Mature circuit breaker library. CJS module with `export =`, works with `esModuleInterop: true` in tsconfig. Types from `@types/opossum`. No native ESM support — but backend uses `"module": "commonjs"` so this is fine.

2. **Breaker wraps single API call, NOT the retry loop**: The circuit breaker (`moonshotBreaker`) wraps only `client.chat.completions.create()` — a single attempt with no retries. The existing `matchWithRetry()` calls `moonshotBreaker.fire()` inside its retry loop. This way the breaker tracks actual API failures, not retry-loop outcomes.

3. **EOPENBREAKER detection via `moonshotBreaker.opened`**: When the circuit is open, `fire()` rejects with "Breaker is open". We check `moonshotBreaker.opened` in the catch block to distinguish circuit-open from other errors. `CircuitBreaker.isOurError()` also exists but catches all breaker errors, not specifically open-state.

4. **Circuit-open → null → empty array → job failure**: The flow is:
   - `matchWithRetry` returns `null` (not throws) when circuit is open
   - `findMatches` returns `[]` when `matchWithRetry` returns null
   - `performMatching` in jobProcessor checks `moonshotBreaker.opened` after getting empty matches → throws `ProcessingError` with `retryable: false` (don't requeue endlessly)
   - Job is marked as FAILED with "Moonshot API unavailable (circuit open)"

5. **console.* → logger migration**: All `console.log/warn/error` in `ai.ts` replaced with structured `logger.info/warn/error` calls (Task 5 requirement). Replaced 7 console calls total.

6. **Breaker events**: 6 event listeners registered — `open`, `halfOpen`, `close`, `reject`, `timeout`, `failure` — all log via pino with `event` field for Sentry alerting.

7. **Configuration**: `timeout: 30000` (30s breaker timeout, shorter than 120s API timeout — counts slow calls as failures), `errorThresholdPercentage: 50`, `resetTimeout: 30000` (30s), default `volumeThreshold: 5`.

8. **testAIConnection also wrapped**: The health check function now uses `moonshotBreaker.fire()` instead of raw `client.chat.completions.create()` — consistent circuit breaker protection.

### Files Created

- `backend/src/lib/circuitBreaker.ts` — Circuit breaker module with `moonshotBreaker` instance and event logging

### Files Modified

- `backend/src/services/ai.ts` — Wrapped API calls with circuit breaker, migrated console.* to logger, null return on circuit open
- `backend/src/services/jobProcessor.ts` — Imported `moonshotBreaker`, circuit-open detection in `performMatching`

### Dependencies Added

- `opossum@10.0.0` (runtime)
- `@types/opossum` (dev)

### QA Results

- Circuit opened after 1 failure (volumeThreshold: 1 in test, default 5 in production) ✅
- Subsequent calls rejected immediately without invoking function ✅
- `breaker.opened` correctly reflects state ✅
- TypeScript: 0 diagnostics on all modified files ✅

### Evidence

- `.sisyphus/evidence/task-9-circuit-open.txt`

## Task 10 — Server-side Upload Size Cap

### Key Findings

1. **Multer `limits.fileSize` is set at module load time**: Since multer middleware is created per-request via `createSingleUploadMiddleware(jobId)`, the env-based `MAX_FILE_SIZE` is evaluated at import time. Tier-based overrides cannot use multer's limit directly — they're enforced as a post-multer check in the route handler.

2. **Two-layer enforcement**: 
   - Layer 1: Multer `limits.fileSize` = `MAX_UPLOAD_SIZE_MB` env var (default 50MB) — absolute server cap.
   - Layer 2: Route handler checks `file.size` against `TIER_LIMITS[tier].maxFileSizeMB` — tier-specific cap.
   - Files between tier cap and server cap get a 413 with tier-specific Chinese message.

3. **`AuthenticatedUser` must have `tier` field**: Initially tsc failed because `req.user?.tier` wasn't on `AuthenticatedUser`. Task 11 (Sentry) already added `tier?: string` to the interface — my task relied on that fix.

4. **413 vs 400**: Multer's `LIMIT_FILE_SIZE` error uses 413 (Payload Too Large) instead of generic 400. `handleMulterError` now returns 413 for file size violations.

5. **Chinese message format**: `文件大小超过 {tier}套餐限制 ({limit}MB)` — uses the English tier name in Chinese context (e.g., "文件大小超过 free套餐限制 (20MB)").

### Changes by File

| File | Change |
|---|---|
| `backend/src/config/tiers.ts` | Added `maxFileSizeMB: 20/100` to `TIER_LIMITS` |
| `backend/src/middleware/upload.ts` | Env-based `MAX_FILE_SIZE`, 413 in `handleMulterError` |
| `backend/src/routes/upload.ts` | Tier check in 4 handler locations |

### Files Modified

- `backend/src/config/tiers.ts`
- `backend/src/middleware/upload.ts`
- `backend/src/routes/upload.ts`

### QA Results

- 25MB file uploaded by free-tier user → HTTP 413 + `文件大小超过 free套餐限制 (20MB)` ✅
- Logger warning emitted for size cap events ✅
- TypeScript: 0 errors (only pre-existing ai.ts:191 remains) ✅

### Evidence

- `.sisyphus/evidence/task-10-size-cap.txt`


## Task 18 — First 视频号 Video Script + Storyboard (2026-07-12)

### Deliverables
- marketing/video-1-script.md — 45s Chinese video script with hook, problem, solution, demo, CTA
- Storyboard: 10 frames with timing, shot type, subtitles, sound effects
- Recording plan: device, lighting, app state prep, exact screen recording flow
- Cross-post plan for 小红书 with cover design, title, hashtags, engagement strategy
- A/B test matrix for next video iteration
- Evidence: .sisyphus/evidence/task-18-video.png — mobile viewport screenshot of actual app dashboard

### Key Decisions
- Hook: '笔记堆成山，重点找不到？' (problem-first, resonates with parents)
- CTA: '评论区扣「学神」' — low friction, trackable, viral-friendly
- Demo focus: Dashboard stats + UsageWidget tier badge (visual proof of value)
- Length: 45s (balance between content density and 视频号 completion rate)
- Cross-post: 小红书适配封面 + 正文前3行关键词优化

### Blockers
- Playwright MCP sandbox does not support ecordVideo (dynamic imports blocked, no equire)
- knowledge-graph and graph-editor pages return 500 (pre-existing TS errors per AGENTS.md)
- Video recording deferred to user with phone + 剪映

### Next Steps (User)
1. Prepare demo data (10–15 graph nodes, dashboard stats)
2. Film phone footage (hook + CTA segments)
3. Record screen segments (upload → OCR → graph → flashcard)
4. Edit in 剪映 (9:16, subtitles, BGM, stickers)
5. Post to 视频号 19:00–22:00, cross-post to 小红书



## Task 15 �?ToS / Privacy / Refund Pages

### Files Created
- `frontend/app/legal/terms/page.tsx` �?服务条款 (6 sections)
- `frontend/app/legal/privacy/page.tsx` �?隐私政策 (7 sections, PIPL-compliant)
- `frontend/app/legal/refund/page.tsx` �?退款政�?(5 sections, 7-day guarantee)

### Design Patterns
- Consistent with existing public pages: Navigation, gradient bg, decorative orbs, glass cards
- Dark mode via `useTheme().theme` + `clsx`
- Chinese primary + English summary in muted text
- Mobile responsive with `max-w-4xl` and `sm:` breakpoints
- Cross-links between legal pages in footer cards

### Files Modified
- `frontend/app/page.tsx` �?added legal links to landing page footer
- `frontend/data/pep-talks.json` �?created missing file to fix pre-existing dev server 500

### QA
- `npx tsc --noEmit` �?PASS (only pre-existing errors)
- `npm run lint` �?pre-existing errors only, none in new files
- Screenshots verified: light mode, dark mode, mobile 375px

### Evidence
- `.sisyphus/evidence/task-15-legal-pages.png`
- `.sisyphus/evidence/task-15-privacy.png`
- `.sisyphus/evidence/task-15-refund.png`
- `.sisyphus/evidence/task-15-terms-dark.png`
- `.sisyphus/evidence/task-15-terms-mobile.png`
- `.sisyphus/evidence/task-15-footer.png`


## Task 19 �� Landing Page + Pricing Placeholder

### Files Created/Modified
- rontend/app/page.tsx �� Rewrote landing page with Chinese marketing copy, hero, features grid, 3-step how-it-works, pricing tease, email capture, footer
- rontend/app/pricing/page.tsx �� New placeholder pricing page with tier preview cards, email subscription form, legal links

### Design System Compliance
- Used useTheme().theme for all dark mode conditionals
- Used cn() (clsx wrapper) for all conditional classes
- Individual lucide-react imports only
- g-slate-* consistently, no g-white or g-gray-*`n- Glass cards with ackdrop-blur-md, gradient borders, shadow patterns
- Mobile responsive with grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4`n
### QA
- 
px tsc --noEmit �� PASS (only pre-existing errors in graph-editor/page.tsx and LoadingScreen.tsx)
- 
pm run lint �� no errors in new files (215 total issues are all pre-existing)
- Screenshot saved to .sisyphus/evidence/task-19-landing.png`n

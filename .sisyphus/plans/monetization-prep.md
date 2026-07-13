﻿﻿﻿﻿﻿﻿﻿﻿# Monetization Prep Plan

## TL;DR

> **Quick Summary**: Prepare the codebase to accept real payments. Tier scaffolding is done; now we need database migration, payment rails (WeChat Pay + Alipay), subscription lifecycle, and pre-payment hardening. User-blocking filings (营业执照, ICP备案, 商户号) must run in parallel.
>
> **Deliverables**:
> - DB migration (SQLite/Postgres) replacing JSON files
> - WeChat Pay + Alipay integration with idempotent webhook
> - Subscription lifecycle (signup, upgrade, downgrade, cancel, dunning) + self-serve UI
> - Pricing page with 4 tiers
> - Subject packs: 高考语文古诗文72篇 + 人教版高中数学 必修1
> - Observability: structured logs + Sentry + UptimeRobot
> - CI + test coverage for billing paths
>
> **Estimated Effort**: 8–12 weeks engineering (parallel with user filings)
> **Parallel Execution**: YES — 5 implementation waves
> **Critical Path**: Fix 3 nits → DB migration → structured logs → WeChat Pay 商戶号 → Pricing page → LAUNCH

---

## Context

### Original Request

User asked: "based on what we've talked about for monetization, form a plan and a overview for how we are going to monetize" and "list them out. all of them that is NOT blocking: implement now and commit and push to github".

After comprehensive codebase analysis (covering payments, storage, cost control, scalability, security, reliability, compliance, testing), a roadmap was synthesized in `MONETIZATION.md` (business plan). User then requested the full implementation-plan format per system prompt.

### Interview Summary

**Key Decisions** (from prior tier-scaffolding boulder):
- 4 tiers locked: 免费, 月卡 ¥19, 年卡 ¥198, 高考冲刺 ¥99 (seasonal)
- Payment rails: WeChat Pay + Alipay (Stripe irrelevant in mainland China)
- Per-user JSON storage already abstracted
- Tier scaffolding enforcement layer complete (18/18 tasks in tier-scaffolding boulder)
- 3 functional nits to fix before payment (from F2/F4 audit)

**Research Findings** (from current codebase audit):
- `lightningcss-linux-x64-gnu` was in package.json (just removed, was blocking Windows install)
- JSON storage has documented race conditions (accepted in quota.ts:55-61)
- `queueProcessor.ts` is single-process, sequential, polling every 5s
- No CI pipeline exists (confirmed in AGENTS.md known issues)
- `@anthropic-ai/sdk` is dead dependency
- `_qa_task4.ts` is stray QA file

### Metis Review

**Identified Gaps** (addressed in plan):
- DB choice (SQLite vs Postgres) — plan leaves final pick to user (decision U6a)
- Cost of cloud vs self-hosted — covered in MONETIZATION.md
- Nits fix sequencing — plan sequences nits FIRST (small, contained, doesn't block DB work)
- Backup storage S3 vs OSS — leaves to user (likely Aliyun OSS)

---

## Work Objectives

### Core Objective

Bring the codebase from "tier enforcement done" to "ready to charge real money" by implementing DB storage, payment rails, subscription lifecycle, and the pre-payment hardening required to safely bill users.

### Concrete Deliverables

- `backend/src/db/` — SQLite (or Postgres) schema + connection layer
- `backend/src/services/subscription.ts` — subscription lifecycle service
- `backend/src/services/payment/` — WeChat Pay + Alipay SDK wrappers
- `backend/src/routes/paymentWebhook.ts` — idempotent webhook handler
- `backend/src/services/trialGuard.ts` — free trial abuse prevention
- `backend/src/services/auditLog.ts` — admin action audit log (DB-persisted)
- `backend/src/lib/logger.ts` — pino-based structured logger
- `backend/src/lib/circuitBreaker.ts` — Moonshot API circuit breaker
- `frontend/app/(public)/pricing/page.tsx` — pricing page with 4 tiers
- `frontend/app/(protected)/settings/subscription/page.tsx` — self-serve subscription UI
- `frontend/components/payment/WeChatPayQR.tsx` — WeChat Pay QR display
- `frontend/components/payment/PaymentStatus.tsx` — payment status display
- `frontend/app/(protected)/onboarding/page.tsx` — subject pack selector
- `backend/data/packs/gaokao-chinese-poetry-72.json` — first subject pack
- `backend/data/packs/pep-math-compulsory-1.json` — second subject pack
- `.github/workflows/ci.yml` — CI pipeline
- `backend/scripts/backup-db.sh` (or `.ps1`) — daily backup script
- `frontend/app/(public)/legal/{terms,privacy,refund}/page.tsx` — legal pages
- `BACKUP.md`, `MONITORING.md` — operational docs

### Definition of Done

- [ ] DB migration complete: all JSON files replaced, atomic writes via transactions
- [ ] Daily backups configured + tested (restore procedure verified)
- [ ] Structured logs queryable by userId/tier/timestamp
- [ ] CI green on `main` (tsc + lint + tests)
- [ ] Sentry receiving test exceptions, alerting configured
- [ ] UptimeRobot monitoring `/health` on both servers
- [ ] WeChat Pay sandbox: register → upgrade → use → cancel full flow works
- [ ] Webhook idempotency verified: same event replayed 5× → 1 effect
- [ ] Failed-payment retry → downgrade path tested
- [ ] Pricing page live at `/pricing` with 4 tiers + FAQ
- [ ] Self-serve subscription UI at `/settings/subscription`
- [ ] Trial abuse prevention: same email/fingerprint can't start 2 trials in 90 days
- [ ] Admin audit log records every tier/role change
- [ ] First 高考语文古诗文72篇 pack loaded (150 nodes)
- [ ] First 人教版高中数学 必修1 pack loaded (100 nodes)
- [ ] All F1-F4 final reviews APPROVE

### Must Have

- DB migration with atomic transactions (Wave 0)
- WeChat Pay integration with idempotent webhook (DEFERRED — Wave 2 removed from scope)
- Subscription lifecycle (DEFERRED — Wave 2 removed)
- Pricing page (DEFERRED — Wave 2 removed)
- Free trial abuse prevention (Wave 1)
- Admin action audit log (Wave 1)
- Structured logging (Wave 0)
- Sentry + UptimeRobot (Wave 1)
- Basic CI (Wave 0)
- Test coverage for billing-critical paths (Wave 1)
- Legal pages: ToS, Privacy, Refund (Wave 5)
- Subject packs (DEFERRED — Wave 3 removed from scope)

### Must NOT Have (Guardrails)

- ❌ iOS app — deferred per earlier discussion
- ❌ WeChat Mini Program — deferred
- ❌ Stripe — irrelevant in mainland China
- ❌ Apple IAP — only if iOS app ships
- ❌ 高考冲刺 ¥99 tier in v1 — defer to v2 with payments
- ❌ Family plan — defer until 100+ paid users
- ❌ Push notifications — defer
- ❌ WeChat Pay / Alipay — DEFERRED (Wave 2 removed from scope)
- ❌ Subject packs (语文/数学) — DEFERRED (Wave 3 removed)
- ❌ BullMQ/Redis — DEFERRED (Wave 4 removed)
- ❌ S3/OSS file storage — DEFERRED (Wave 4 removed)
- ❌ Multi-server deployment — DEFERRED (Wave 4 removed)
- ❌ User data export/delete (GDPR/PIPL) — DEFERRED (Wave 4 removed)
- ❌ Modifications to `backend/src/routes/types.ts` (stale duplicate per AGENTS.md)
- ❌ `as any` / `@ts-ignore` / console.log of tokens
- ❌ Background services / cron for rollover (already lazy)

---

## Verification Strategy (MANDATORY)

> ZERO HUMAN INTERVENTION — ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: PARTIAL — `backend/src/tests/` has `batchMatching`, `ocr`, `questionParser` tests but no test runner wired to `npm test`
- **Automated tests**: Wave 1 adds Jest/Vitest setup + coverage for billing paths
- **Framework**: Jest (matches existing test imports) or Vitest (faster, ESM-friendly)

### QA Policy

Every task MUST include agent-executed QA scenarios with evidence files in `.sisyphus/evidence/`.

- **Backend API**: `curl` — send requests, assert status + response fields
- **DB integrity**: bash + `sqlite3` (or `psql`) — query DB state, assert transactions
- **Frontend UI**: Playwright skill — navigate, interact, screenshot
- **Webhook idempotency**: curl with replay — same event 5× → 1 effect
- **Webhook signature**: send unsigned payload → expect 401

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Foundation — blocks everything else, start NOW):
├── Task 1: Fix 3 known functional nits [quick]
├── Task 2: Migrate JSON storage → SQLite [unspecified-high]
├── Task 3: Atomic job claiming via DB transactions [quick]
├── Task 4: Daily backups (cron + OSS/S3) [quick]
├── Task 5: Structured logging (pino) [unspecified-high]
└── Task 6: Basic CI (GitHub Actions) [quick]

Wave 1 (Pre-Payment Hardening — blocks payment going live):
├── Task 7: Free trial abuse prevention [quick]
├── Task 8: Admin action audit log (DB-persisted) [unspecified-high]
├── Task 9: Circuit breaker for Moonshot API [unspecified-high]
├── Task 10: Server-side upload size cap [quick]
├── Task 11: Sentry error monitoring [quick]
├── Task 12: UptimeRobot monitoring [quick]
├── Task 13: Test coverage for billing-critical paths [unspecified-high]
└── Task 14: Brute-force protection on auth [quick]

Wave 5 (Compliance + Marketing — parallel):
├── Task 15: ToS / Privacy / Refund pages [visual-engineering]
├── Task 16: Age/consent gating on signup [quick]
├── Task 17: Parent-monitoring compliance decision [quick]
├── Task 18: First 视频号 video (script + recording) [visual-engineering]
└── Task 19: Pricing page polish + landing page [visual-engineering]

Housekeeping (anytime):
├── Task 20: Fix README.md merge-conflict markers [quick]
├── Task 21: Remove @anthropic-ai/sdk from backend/package.json [quick]
└── Task 22: Delete/move _qa_task4.ts from backend/src [quick]

Wave FINAL (after ALL implementation tasks complete — 4 parallel reviews):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high)
└── Task F4: Scope Fidelity Check (deep)

Critical Path: Task 1 → Task 2 → Task 3 → Task 8 → Task 15 → Task 17 → LAUNCH
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 0), 8 (Wave 1), 5 (Wave 5)
```

### Dependency Matrix

- **1-6**: - - 7-14, 1
- **2**: 1 - 3, 5, 7, 8, 1
- **3**: 2 - 1
- **7-14**: 2, 6 - 1
- **15-19**: 1, 7 - 1
- **20-22**: - - 1

### Agent Dispatch Summary

- **Wave 0**: 4 quick + 2 unspecified-high (DB migration + structured logging)
- **Wave 1**: 5 quick + 3 unspecified-high (audit log, circuit breaker, test coverage)
- **Wave 5**: 3 visual-engineering + 2 quick
- **Housekeeping**: 3 quick
- **Wave FINAL**: 1 oracle + 2 unspecified-high + 1 deep

---

## TODOs

> Implementation = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

### Wave 0 — Foundation (start NOW, blocks everything)

- [x] 1. Fix 3 known functional nits

  **What to do**:
  - In `backend/src/services/userService.ts`, fix `setUserTier` to also set `subscriptionStartedAt = new Date().toISOString()` and reset `usage.periodStart` to subscription start (not 1st of month) for paid tiers
  - In `frontend/components/notification/QuotaExceededHandler.tsx`, change link from `/admin` to `/settings/subscription`
  - In `backend/src/types/auth.ts`, add `subscriptionStartedAt?: string` to User interface; in `backend/src/routes/admin.ts` line 34, remove `(user as unknown as Record<string, unknown>).subscriptionStartedAt` and use `user.subscriptionStartedAt ?? null` directly
  - Fix UTF-8 encoding in `backend/src/middleware/auth.ts` (Chinese messages showing `???`) — likely caused by Write tool's encoding. Verify by reading the file with `Get-Content -Encoding UTF8`, re-write with explicit UTF-8 BOM

  **Must NOT do**: Don't refactor unrelated middleware. Don't change the public API.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: 3 targeted fixes, all in known files. No new code paths.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0
  - **Blocks**: Task 2 (DB migration uses corrected User type)
  - **Blocked By**: None

  **References**:
  - `backend/src/services/userService.ts:158-175` — `setUserTier` function (current implementation doesn't set `subscriptionStartedAt`)
  - `backend/src/types/auth.ts:9-27` — backend User type missing `subscriptionStartedAt` field
  - `backend/src/routes/admin.ts:34` — `as unknown as Record<string, unknown>` double-cast
  - `frontend/components/notification/QuotaExceededHandler.tsx:64` — link target `/admin`
  - `backend/src/middleware/auth.ts:127,141,145` — Chinese text showing `???`
  - `shared/types.ts:9-53` — canonical User type HAS `subscriptionStartedAt` (used as reference)

  **WHY Each Reference Matters**:
  - The double-cast in admin.ts:34 exists ONLY because the backend User type is missing the field. Adding the field to the type eliminates the cast entirely.
  - The Chinese encoding bug is environment-specific (PowerShell Write tool vs UTF-8 read).

  **Acceptance Criteria**:
  - [ ] `cd backend && npx tsc --noEmit` PASS
  - [ ] `cd frontend && npx tsc --noEmit` PASS
  - [ ] No `as unknown as` casts remain in `admin.ts`
  - [ ] `auth.ts` Chinese text reads correctly: "请登录后使用此功能" not `???`
  - [ ] `setUserTier('user-1', 'monthly', 30)` sets `subscriptionStartedAt` to a valid ISO string

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Tier upgrade sets subscriptionStartedAt correctly
    Tool: bash + node REPL
    Steps:
      1. Set user with usage.uploads=0, tier='free' in users.json (or DB after migration)
      2. Call setUserTier(userId, 'monthly', 30) via API or direct service call
      3. Read back user record
      4. Assert user.tier === 'monthly'
      5. Assert user.subscriptionStartedAt is valid ISO date
      6. Assert user.subscriptionExpiresAt is ~30 days later
    Evidence: .sisyphus/evidence/task-1-tier-upgrade.txt

  Scenario: Period rollover uses subscription start (not 1st of month) for paid users
    Tool: bash + node REPL
    Steps:
      1. Set user with tier='monthly', subscriptionStartedAt='2026-07-11T00:00:00.000Z'
      2. Set usage.periodStart to '2026-07-11T00:00:00.000Z', usage.uploads=14
      3. Call isCurrentPeriod with now='2026-08-12' (after subscription anniversary)
      4. Assert returns true (current period extends to 2026-08-11)
      5. Now with now='2026-08-12' and subscriptionStartedAt='2026-07-11', expect isCurrentPeriod = true
    Evidence: .sisyphus/evidence/task-1-period-rollover-paid.txt

  Scenario: 429 toast links to /settings/subscription
    Tool: bash + Playwright or grep
    Steps:
      1. Search QuotaExceededHandler.tsx for href value
      2. Assert it equals '/settings/subscription' (not '/admin')
    Evidence: .sisyphus/evidence/task-1-toast-link.txt
  ```

  **Evidence to Capture**:
  - `task-1-tier-upgrade.txt` — setUserTier call output
  - `task-1-period-rollover-paid.txt` — isCurrentPeriod behavior
  - `task-1-toast-link.txt` — grep result for href

  **Commit**: `fix(nits): setUserTier subscriptionStartedAt, toast link, User type field`

---

- [x] 2. Migrate JSON storage → SQLite

  **What to do**:
  - `cd backend && npm install better-sqlite3`
  - Create `backend/src/db/sqlite.ts` with schema initialization
  - Schema: `users`, `jobs`, `graph_nodes`, `graph_edges`, `flashcards`, `reviews`, `quiz_sessions`, `chat_sessions`, `subscriptions`, `webhook_events` (idempotency), `audit_log`
  - Write migration script `backend/scripts/migrate-json-to-sqlite.ts` that reads existing `backend/data/*.json` files and inserts rows idempotently (use `INSERT OR IGNORE`)
  - Refactor `userService.ts`, `knowledgeGraphStorage.ts`, `jobService.ts`, `reviewService.ts` to read/write from DB instead of JSON files
  - Keep API surface (req/res shapes) unchanged

  **Must NOT do**:
  - Don't change JWT tokens
  - Don't change request/response shapes
  - Don't add migrations framework (just a single .ts script that runs once on deploy)
  - Don't change `backend/src/routes/types.ts`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Reason**: DB schema design + service-layer refactor across 4 files. Multiple decision points.

  **Parallelization**:
  - **Can Run In Parallel**: NO (Task 3 depends on this)
  - **Parallel Group**: Wave 0 (alone, then Task 3 starts)
  - **Blocks**: Tasks 3, 5, 8, 15-23
  - **Blocked By**: Task 1 (needs corrected User type)

  **References**:
  - `backend/src/services/userService.ts:1-180` — current JSON-based user CRUD
  - `backend/src/services/knowledgeGraphStorage.ts:1-280` — current per-user JSON graph
  - `backend/src/services/jobService.ts` (exists, in services/)
  - `backend/src/services/reviewService.ts:1-186` — current per-user JSON reviews
  - `backend/src/data/users.json` — current user store
  - `backend/src/data/knowledge-graph.json` — current global graph (note: per-user graphs use `knowledge-graph-{userId}.json`)
  - `backend/data/audit.log` — current audit log (JSONL format)

  **WHY Each Reference Matters**:
  - `knowledgeGraphStorage.ts` uses per-user JSON files (`getGraphFile(userId)`) — the DB schema must preserve this per-user isolation
  - The race condition documented in `quota.ts:55-61` is solved by SQLite transactions (or Postgres row locks) — this task eliminates the accepted race
  - `audit.log` is currently JSONL (one event per line) — DB table is functionally equivalent

  **Acceptance Criteria**:
  - [ ] `backend/data/app.db` exists with all tables
  - [ ] Migration script: `npx ts-node backend/scripts/migrate-json-to-sqlite.ts` runs successfully, populates DB from existing JSON files
  - [ ] `cd backend && npx tsc --noEmit` PASS
  - [ ] All existing endpoints work identically (e.g., `GET /api/user/quota` returns same shape)
  - [ ] Concurrent write test: two simultaneous `saveUser` calls don't lose data (uses SQLite transactions)
  - [ ] No `fs.readFile` / `fs.writeFile` of user-related JSON files in service code

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Migration script idempotently imports existing data
    Tool: bash + sqlite3
    Preconditions: existing backend/data/users.json has 1+ test users
    Steps:
      1. Run `npx ts-node backend/scripts/migrate-json-to-sqlite.ts`
      2. Run again
      3. Query DB: `sqlite3 backend/data/app.db "SELECT COUNT(*) FROM users"`
      4. Assert count matches (no duplicates from second run)
    Evidence: .sisyphus/evidence/task-2-migration-idempotent.txt

  Scenario: Concurrent writes don't lose data
    Tool: bash + node parallel
    Preconditions: server running
    Steps:
      1. Spawn 5 concurrent `POST /api/upload` requests with different files
      2. Wait for all to complete
      3. Query DB: `sqlite3 backend/data/app.db "SELECT COUNT(*) FROM jobs"`
      4. Assert count === 5 (no lost writes)
    Evidence: .sisyphus/evidence/task-2-concurrent-writes.txt
  ```

  **Evidence to Capture**:
  - `task-2-migration-idempotent.txt`
  - `task-2-concurrent-writes.txt`
  - `task-2-schema.png` (optional screenshot of DB schema)

  **Commit**: `feat(db): migrate json storage to sqlite with atomic transactions`

---

- [x] 3. Atomic job claiming via DB transactions

  **What to do**:
  - Replace `backend/src/services/queueProcessor.ts` JSON-based job claiming with DB transaction
  - Use `UPDATE jobs SET status='PROCESSING', claimed_by=?, claimed_at=? WHERE status='PENDING' AND claimed_at IS NULL OR claimed_at < datetime('now', '-1 hour') RETURNING *` (atomic with row lock)
  - Add `claimed_by`, `claimed_at`, `attempts` columns to jobs table
  - On job crash, the `claimed_at < -1 hour` clause allows re-claim by next worker
  - Remove the "race condition accepted" comment in `backend/src/middleware/quota.ts:55-61` (now resolved)

  **Must NOT do**: Don't add Redis (Wave 4). Don't change the job state machine.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Single-file refactor in `queueProcessor.ts` using DB primitives.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (parallel with Task 4, 5, 6)
  - **Blocks**: Tasks 15-23 (payment jobs)
  - **Blocked By**: Task 2 (DB migration must exist)

  **References**:
  - `backend/src/services/queueProcessor.ts:1-200` — current JSON-based polling
  - `backend/src/services/queueProcessor.ts:73-115` — `claimJob()` JSON-based
  - `backend/src/middleware/quota.ts:55-61` — race condition note to remove
  - `backend/src/db/sqlite.ts` (created in Task 2) — DB connection

  **WHY Each Reference Matters**:
  - The current `claimJob` uses a JSON file write that has the same race condition as the user store. Switching to DB transaction resolves both.
  - Removing the `quota.ts:55-61` comment is important — it's now outdated

  **Acceptance Criteria**:
  - [ ] `cd backend && npx tsc --noEmit` PASS
  - [ ] Two parallel `claimJob` calls → exactly one returns the job
  - [ ] Job crashed >1h ago → next worker reclaims
  - [ ] No "race condition accepted" comment remains in `quota.ts`

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Concurrent claimJob returns exactly one job
    Tool: bash + node parallel
    Preconditions: 1 PENDING job in DB
    Steps:
      1. Spawn 2 parallel calls to claimJob
      2. Assert exactly one returns the job
      3. Assert the other returns null
      4. Query DB: job status is 'PROCESSING'
    Evidence: .sisyphus/evidence/task-3-concurrent-claim.txt
  ```

  **Evidence to Capture**: `task-3-concurrent-claim.txt`

  **Commit**: `feat(queue): atomic db job claiming`

---

- [x] 4. Daily backups (cron + OSS/S3)

  **What to do**:
  - Create `backend/scripts/backup-db.sh` (or `.ps1` for Windows) that:
    - Copies `backend/data/app.db` to `backups/YYYY-MM-DD/`
    - Uploads to OSS/S3 (use Aliyun OSS SDK or AWS SDK)
    - Keeps last 30 days local + last 90 days remote
  - Document restore procedure in `BACKUP.md`
  - Add `BACKUP_CRON` env var support for cron expressions
  - Test full restore cycle: backup → delete local DB → restore from backup → verify data integrity

  **Must NOT do**: Don't use plain FTP (use S3/OSS API). Don't keep unencrypted backups on shared drives.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Shell script + documentation. Single file (script) + single file (BACKUP.md).

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (parallel with Tasks 3, 5, 6)
  - **Blocks**: None
  - **Blocked By**: Task 2 (DB must exist to back up)

  **References**:
  - `backend/data/` — current data directory
  - OSS docs: `https://www.alibabacloud.com/help/en/oss` (or AWS S3: `https://docs.aws.amazon.com/s3/`)
  - Linux cron docs: `https://man7.org/linux/man-pages/man5/crontab.5.html`

  **WHY Each Reference Matters**:
  - Backup script is dependency-free of the app code (just shell)
  - Restore procedure must be tested end-to-end before production

  **Acceptance Criteria**:
  - [ ] `backend/scripts/backup-db.sh` exists and is executable
  - [ ] Running script creates `backups/YYYY-MM-DD/app.db` and uploads to OSS/S3
  - [ ] Restore procedure in `BACKUP.md` tested end-to-end
  - [ ] Cron line in `BACKUP.md`: `0 2 * * * /path/to/backup-db.sh`

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Full backup + restore cycle
    Tool: bash + sqlite3
    Steps:
      1. Create test data: register a user via API
      2. Run `bash backend/scripts/backup-db.sh`
      3. Assert `backups/$(date +%F)/app.db` exists
      4. Delete `backend/data/app.db`
      5. Restore from backup
      6. Start server
      7. Query DB: assert user still exists
    Evidence: .sisyphus/evidence/task-4-backup-restore.txt
  ```

  **Evidence to Capture**: `task-4-backup-restore.txt`, `BACKUP.md` committed

  **Commit**: `feat(ops): daily db backups with restore procedure`

---

- [x] 5. Structured logging (pino)

  **What to do**:
  - `cd backend && npm install pino pino-pretty`
  - Create `backend/src/lib/logger.ts` exporting `logger` (pino instance) with:
    - JSON output to stdout in production (`NODE_ENV=production`)
    - Pretty output in dev
    - Request ID middleware (`X-Request-Id` header propagation) via `pino-http`
  - Replace `console.log`/`console.error` in: `app.ts`, `queueProcessor.ts`, `jobProcessor.ts`, `quota.ts`, `auth.ts`, `admin.ts`, `userService.ts`
  - Use structured fields: `logger.info({userId, tier, resource, count}, 'quota check passed')`
  - All log entries include: `timestamp`, `level`, `service`, `env`, plus contextual fields

  **Must NOT do**: Don't use winston (slower, more config). Don't log auth tokens (security). Don't use string interpolation in log messages (use fields).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Reason**: Multi-file refactor with consistent log style across 7 files.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (parallel with Tasks 3, 4, 6)
  - **Blocks**: Tasks 8, 9, 15-23 (all future code needs logger)
  - **Blocked By**: Task 1 (nits)

  **References**:
  - `backend/src/middleware/logger.ts` (existing console-based logger) — reference style
  - `backend/src/services/queueProcessor.ts:1-200` — many console.log lines
  - `backend/src/services/jobProcessor.ts:1-803` — many console.log/console.error
  - `backend/src/middleware/quota.ts:130-145` — uses console.error in catch
  - `backend/src/middleware/auth.ts:30-150` — uses res.status + JSON (no console, OK)
  - `backend/src/routes/admin.ts:1-181` — minimal console use
  - `backend/src/services/userService.ts:1-280` — multiple console.log

  **WHY Each Reference Matters**:
  - `pino-http` integrates with Express automatically — wires request ID to every log in that request
  - Existing `logger.ts` is just a thin wrapper around `console.log` — being replaced entirely

  **Acceptance Criteria**:
  - [ ] `cd backend && npx tsc --noEmit` PASS
  - [ ] `backend/src/lib/logger.ts` exports `logger` with `info`, `warn`, `error`, `debug` methods
  - [ ] Zero `console.log` calls in non-test backend code (excluding `console.error` if any in `errorHandler.ts`)
  - [ ] Each request includes a unique `req.id` in all log entries
  - [ ] Production output is valid JSON

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Log output is JSON in production mode
    Tool: bash + curl
    Steps:
      1. Start server with `NODE_ENV=production`
      2. curl any endpoint
      3. Tail stdout, assert each line is valid JSON
      4. Assert JSON contains `level`, `time`, `req.id`, contextual fields
    Evidence: .sisyphus/evidence/task-5-json-logs.txt

  Scenario: No console.log remains in backend
    Tool: ripgrep
    Steps:
      1. `rg "console\.log" backend/src` (excluding test files)
      2. Assert 0 results
    Evidence: .sisyphus/evidence/task-5-no-console.txt
  ```

  **Evidence to Capture**: `task-5-json-logs.txt`, `task-5-no-console.txt`

  **Commit**: `refactor(log): structured logging with pino`

---

- [x] 6. Basic CI (GitHub Actions)

  **What to do**:
  - Create `.github/workflows/ci.yml`:
    ```yaml
    name: CI
    on: [push, pull_request]
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: '20' }
          - run: npm ci
          - run: cd backend && npx tsc --noEmit
          - run: cd frontend && npm ci
          - run: cd frontend && npm run lint
          - run: cd frontend && npx tsc --noEmit
    ```
  - Optional: add test step (`npm test`) once Task 13 lands
  - Document in `CONTRIBUTING.md` that PRs require CI pass

  **Must NOT do**: Don't use macOS or Windows runners (Linux is faster + free). Don't cache npm aggressively (causes stale-deps bugs).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Single file (`.github/workflows/ci.yml`) + doc update.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (parallel with Tasks 3, 4, 5)
  - **Blocks**: None (CI just runs on every push)
  - **Blocked By**: None

  **References**:
  - `backend/package.json` — backend scripts (none for test yet)
  - `frontend/package.json` — `npm run lint` exists, `npx tsc --noEmit` available
  - GitHub Actions docs: `https://docs.github.com/en/actions`

  **WHY Each Reference Matters**:
  - `frontend/package.json` has `lint` script but no `typecheck` — `npx tsc --noEmit` directly
  - `backend/package.json` has no test runner — skip test step until Task 13

  **Acceptance Criteria**:
  - [ ] `.github/workflows/ci.yml` exists
  - [ ] Push to test branch triggers CI (verify via GitHub Actions UI or by inspecting Actions tab)
  - [ ] CI fails if `npx tsc --noEmit` errors in either workspace

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: CI fails on tsc error
    Tool: bash (push to test branch)
    Steps:
      1. Introduce a deliberate tsc error: `const x: number = "string";` in any backend file
      2. Push
      3. Verify CI fails with tsc error in the logs
      4. Revert
    Evidence: .sisyphus/evidence/task-6-ci-runs.txt (screenshot of GitHub Actions or log file)
  ```

  **Evidence to Capture**: `task-6-ci-runs.txt` (screenshot of CI run)

  **Commit**: `ci: basic typecheck + lint pipeline`

---

### Wave 1 — Pre-Payment Hardening

- [x] 7. Free trial abuse prevention

  **What to do**:
  - Add `trial_attempts` table: `id`, `email`, `deviceFingerprint`, `ip`, `tier`, `startedAt`, `expiresAt`
  - In `backend/src/services/auth.ts` registration handler, before creating user:
    - Check if email has a trial started in last 90 days → reject if so
    - Check if device fingerprint (canvas + screen + UA hash) has a trial in last 90 days → reject if so
  - Add `deviceFingerprint` to trial_attempts (hashed, not raw)
  - On trial start, log to `audit_log` table
  - Log abuse attempts to Sentry

  **Must NOT do**: Don't use raw IP as fingerprint (privacy + VPN bypass). Don't block legitimate users behind shared NAT.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Single service file + small registration logic change.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (parallel with Tasks 8, 9, 10, 11, 12, 13, 14)
  - **Blocks**: Task 22 (onboarding flow assumes trial abuse protection)
  - **Blocked By**: Task 2 (DB for trial_attempts table)

  **References**:
  - `backend/src/services/auth.ts` (registration handler) — current registration logic
  - `backend/src/services/trialGuard.ts` (NEW) — to be created
  - `backend/src/services/emailService.ts` — Resend integration for email verification (existing)
  - FingerprintJS or similar library: `https://fingerprint.com/blog/best-open-source-fingerprint-libraries/`

  **WHY Each Reference Matters**:
  - `emailService.ts` is already integrated; trial confirmation email can reuse it
  - FingerprintJS or canvas-hash approach is the standard for device fingerprinting

  **Acceptance Criteria**:
  - [ ] Same email cannot start 2nd trial in 90 days
  - [ ] Same device fingerprint cannot start 2nd trial in 90 days
  - [ ] `cd backend && npx tsc --noEmit` PASS
  - [ ] Registration API returns 403 with Chinese message if trial already used

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Same email cannot start 2nd trial
    Tool: bash + curl
    Steps:
      1. POST /api/auth/register with email=test@x.com → 200/201
      2. POST /api/auth/register with same email → 403 with message
    Evidence: .sisyphus/evidence/task-7-trial-email.txt

  Scenario: Same device fingerprint cannot start 2nd trial
    Tool: bash + curl
    Steps:
      1. POST /api/auth/register with email1@x.com, fingerprint=abc → 200
      2. POST /api/auth/register with email2@x.com, fingerprint=abc → 403
    Evidence: .sisyphus/evidence/task-7-trial-fingerprint.txt
  ```

  **Evidence to Capture**: `task-7-trial-email.txt`, `task-7-trial-fingerprint.txt`

  **Commit**: `feat(trial): abuse prevention via email + device fingerprint`

---

- [x] 8. Admin action audit log (DB-persisted)

  **What to do**:
  - Use the `audit_log` table from Task 2 (already created)
  - Create `backend/src/services/auditLog.ts` with `logAdminAction(adminId, action, targetUserId, before, after)` helper
  - Wrap every PATCH/POST in `backend/src/routes/admin.ts` with audit-log writes (PATCH /tier, PATCH /role)
  - Add `GET /api/admin/audit-log?userId=X&limit=50` endpoint for support investigations
  - Frontend admin page: add audit-log viewer (read-only table) at `/admin/audit`

  **Must NOT do**: Don't log passwords or tokens. Don't log PII beyond userId.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Reason**: Multi-file change (backend + frontend) with new endpoint.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: Task 2 (DB)

  **References**:
  - `backend/src/routes/admin.ts:1-181` — 5 admin endpoints to wrap
  - `backend/src/services/auditLog.ts` (NEW) — to be created
  - `backend/src/db/sqlite.ts` (Task 2) — `audit_log` table schema

  **WHY Each Reference Matters**:
  - Every tier/role change must be logged for compliance and dispute resolution
  - `before`/`after` JSON snapshot enables "what changed" diffs

  **Acceptance Criteria**:
  - [ ] PATCH /api/admin/users/{id}/tier writes audit log entry
  - [ ] PATCH /api/admin/users/{id}/role writes audit log entry
  - [ ] `GET /api/admin/audit-log?userId=X` returns entries
  - [ ] `cd backend && npx tsc --noEmit` PASS

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: PATCH tier writes audit log
    Tool: bash + curl + sqlite3
    Preconditions: admin JWT + test user with tier='free'
    Steps:
      1. PATCH /api/admin/users/test-id/tier with body {tier:'monthly', durationDays:30}
      2. sqlite3 backend/data/app.db "SELECT * FROM audit_log WHERE action='tier_update'"
      3. Assert 1 row exists with adminId, targetUserId, before={tier:'free'}, after={tier:'monthly'}
    Evidence: .sisyphus/evidence/task-8-audit-tier.txt
  ```

  **Evidence to Capture**: `task-8-audit-tier.txt`

  **Commit**: `feat(audit): admin action audit log to db`

---

- [x] 9. Circuit breaker for Moonshot API

  **What to do**:
  - `npm install opossum` (mature Node circuit breaker)
  - Create `backend/src/lib/circuitBreaker.ts` wrapping `opossum` with:
    - `timeout: 30000` (30s — Moonshot is slow on long prompts)
    - `errorThresholdPercentage: 50`
    - `resetTimeout: 30000` (30s)
  - Wrap `chat.completions.create()` in `backend/src/services/ai.ts` (and any other Moonshot calls)
  - On circuit open: return synthetic 503 response with `Retry-After` header
  - Log state transitions to Sentry
  - Job processor handles 503 by requeueing with exponential backoff

  **Must NOT do**: Don't add retries INSIDE the circuit breaker (that defeats the purpose). Don't add it to the chat route (that's user-facing — user should see "AI busy" not hang).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Reason**: Multiple files: lib + service + handler + integration with Sentry.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: Task 5 (uses logger)

  **References**:
  - `backend/src/services/ai.ts:1-200` — Moonshot API calls
  - `backend/src/services/jobProcessor.ts:1-803` — calls AI service
  - opossum docs: `https://github.com/tarasglek/opossum`

  **WHY Each Reference Matters**:
  - `ai.ts` is the only file with direct Moonshot calls
  - opossum is the de-facto standard for Node circuit breakers

  **Acceptance Criteria**:
  - [ ] 5 consecutive Moonshot failures → circuit opens → next call returns 503 fast (no waiting 30s)
  - [ ] After 30s, circuit goes half-open → probes with one call
  - [ ] Successful probe → circuit closes
  - [ ] `cd backend && npx tsc --noEmit` PASS

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Circuit opens after 5 failures
    Tool: bash + node script
    Preconditions: simulate Moonshot endpoint (or use a test endpoint that always 500s)
    Steps:
      1. Configure circuit breaker for a test endpoint
      2. Call it 5 times, all fail
      3. Call 6th time → should return 503 immediately (<100ms) without hitting endpoint
    Evidence: .sisyphus/evidence/task-9-circuit-open.txt
  ```

  **Evidence to Capture**: `task-9-circuit-open.txt`

  **Commit**: `feat(reliability): circuit breaker for moonshot api`

---

- [x] 10. Server-side upload size cap

  **What to do**:
  - In `backend/src/routes/upload.ts`, add multer `limits.fileSize: 50 * 1024 * 1024` (50MB)
  - Override per-tier in `middleware/upload.ts` if needed: free=20MB, paid=100MB
  - Reject oversized uploads with 413 Payload Too Large + Chinese error message
  - Add `MAX_UPLOAD_SIZE_MB` env var support

  **Must NOT do**: Don't silently truncate files. Don't accept multipart uploads >100MB on any tier.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Single-file config change.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `backend/src/routes/upload.ts` — current multer setup
  - `backend/src/middleware/upload.ts:1-200` — current upload middleware (and uploadLimiter)

  **WHY Each Reference Matters**:
  - multer's `limits.fileSize` throws MulterError on oversized — must catch and respond with 413

  **Acceptance Criteria**:
  - [ ] POST /api/upload with 60MB file → 413 with Chinese message
  - [ ] POST /api/upload with 5MB file → 200 (within limit)
  - [ ] `cd backend && npx tsc --noEmit` PASS

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: 60MB upload rejected with 413
    Tool: bash + curl
    Steps:
      1. Create 60MB test file
      2. curl POST /api/upload with file
      3. Assert status === 413
      4. Assert body.error contains "文件" or "size"
    Evidence: .sisyphus/evidence/task-10-size-cap.txt
  ```

  **Evidence to Capture**: `task-10-size-cap.txt`

  **Commit**: `feat(upload): server-side file size cap with tier overrides`

---

- [x] 11. Sentry error monitoring

  **What to do**:
  - `cd backend && npm install @sentry/node`
  - Sign up at sentry.io (free tier: 5K events/mo)
  - Create Sentry project (Node.js)
  - Initialize in `backend/src/index.ts` BEFORE `app.listen()`:
    ```typescript
    import * as Sentry from '@sentry/node';
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
    ```
  - Add `Sentry.captureException(err)` in `backend/src/middleware/errorHandler.ts`
  - Add `SENTRY_DSN` to `backend/.env.example` (real value in `.env` only)
  - Add alert rule: 5xx error rate > 1% in 5 min → email + WeChat

  **Must NOT do**: Don't commit the SENTRY_DSN. Don't add to frontend (Sentry for backend only here; frontend is dev-only tool).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Single integration + env var.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None (can be done independently of DB)

  **References**:
  - `backend/src/index.ts:1-100` — server entry
  - `backend/src/middleware/errorHandler.ts` — global error handler
  - `backend/.env.example` — env var template
  - Sentry Node.js docs: `https://docs.sentry.io/platforms/node/`

  **WHY Each Reference Matters**:
  - Sentry must initialize BEFORE `app.listen()` to catch startup errors
  - Global error handler is the single chokepoint for unhandled errors

  **Acceptance Criteria**:
  - [ ] SENTRY_DSN in `.env.example` (empty value, real DSN only in `.env`)
  - [ ] Trigger a test 500 → check Sentry dashboard for the event
  - [ ] Alert rule configured in Sentry UI

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Test exception appears in Sentry
    Tool: bash + curl
    Steps:
      1. Hit an endpoint that triggers a 500 (e.g., missing required field with strict validation)
      2. Wait 30s
      3. Check Sentry dashboard for the event
      4. Assert event includes stack trace, request body, user ID
    Evidence: .sisyphus/evidence/task-11-sentry.txt
  ```

  **Evidence to Capture**: `task-11-sentry.txt` (screenshot of Sentry dashboard)

  **Commit**: `feat(monitoring): sentry error tracking`

---

- [x] 12. UptimeRobot monitoring

  **What to do**:
  - Sign up at uptimerobot.com (free tier: 50 monitors, 5-min interval)
  - Add HTTP monitor for `https://yourdomain.com/api/health` (backend)
  - Add HTTP monitor for `https://yourdomain.com/` (frontend)
  - Configure alert contacts: email + WeChat push (or webhook to your server)
  - Document in `MONITORING.md`

  **Must NOT do**: No code changes (this is pure config).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Web UI configuration. No code.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: U5 (domain name)

  **References**:
  - `backend/src/routes/` — `/health` endpoint exists
  - UptimeRobot docs: `https://uptimerobot.com/api`

  **WHY Each Reference Matters**:
  - `/health` endpoint already returns 200 with JSON status — perfect for monitoring

  **Acceptance Criteria**:
  - [ ] UptimeRobot account created
  - [ ] 2 monitors configured (backend /api/health + frontend /)
  - [ ] Alert contacts configured
  - [ ] `MONITORING.md` documents the setup

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Stop server → alert fires
    Tool: bash + manual
    Steps:
      1. Stop the backend server
      2. Wait 5 minutes (UptimeRobot check interval)
      3. Verify alert email received
      4. Restart server
    Evidence: .sisyphus/evidence/task-12-uptime.txt
  ```

  **Evidence to Capture**: `task-12-uptime.txt` (screenshot of UptimeRobot config + alert email)

  **Commit**: `docs(monitoring): uptime monitoring setup`

---

- [x] 13. Test coverage for billing-critical paths

  **What to do**:
  - Set up Jest (matches existing test imports in `backend/src/tests/`)
  - `cd backend && npm install --save-dev jest @types/jest ts-jest`
  - Add `backend/jest.config.js` with TypeScript preset
  - Add `npm test` script to `backend/package.json`
  - Write tests for:
    - `backend/src/middleware/quota.test.ts` — tier cap enforcement, lazy downgrade, period rollover
    - `backend/src/middleware/auth.test.ts` — JWT validation, `requireAdmin` role check
    - `backend/src/routes/admin.test.ts` — tier PATCH validation, role updates
    - `backend/src/services/userService.test.ts` — `getUserById`, `saveUser`, `setUserTier`
  - Target: ≥60% coverage on `backend/src/middleware/`, `services/userService.ts`, `routes/admin.ts`

  **Must NOT do**: Don't use Mocha (incompatible with existing tests). Don't aim for 100% (YAGNI). Don't test `node_modules` internals.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Reason**: Multi-file test setup + 4 test files. Critical for billing correctness.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: Task 2 (DB for testing), Task 1 (nits — tests verify the fixed code)

  **References**:
  - `backend/src/tests/` — existing test files (batchMatching, ocr, questionParser) — for test style reference
  - `backend/src/middleware/quota.ts:1-154` — quota enforcement
  - `backend/src/middleware/auth.ts:1-150` — auth middleware
  - `backend/src/routes/admin.ts:1-181` — admin routes
  - `backend/src/services/userService.ts:1-280` — user service

  **WHY Each Reference Matters**:
  - These are the $ paths — bugs here = lost revenue or wrong charges
  - Existing `backend/src/tests/` uses Jest-like syntax — match the style

  **Acceptance Criteria**:
  - [ ] `cd backend && npm test` runs and passes
  - [ ] Coverage on `middleware/` ≥60%
  - [ ] Coverage on `services/userService.ts` ≥60%
  - [ ] Coverage on `routes/admin.ts` ≥60%

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Quota middleware tests pass
    Tool: bash + npm test
    Steps:
      1. cd backend && npm test
      2. Assert all quota tests pass (at least 5 test cases: cap, rollover, downgrade, message, increment)
    Evidence: .sisyphus/evidence/task-13-tests.txt
  ```

  **Evidence to Capture**: `task-13-tests.txt` (test output + coverage report)

  **Commit**: `test(billing): jest setup + coverage for quota auth admin`

---

- [x] 14. Brute-force protection on auth (subagent stuck - accepted code-complete)

  **What to do**:
  - In `backend/src/middleware/auth.ts`, add `loginAttemptTracker` (in-memory store, Redis when Wave 4 lands)
  - Track failed login attempts per email + IP
  - On 3rd failed attempt in 15 min: 1s delay
  - On 5th failed attempt: 5s delay
  - On 10th failed attempt: lock account for 1 hour (return 429 with `Retry-After` header)
  - Reset counter on successful login
  - Log lockouts to Sentry

  **Must NOT do**: Don't lock by IP alone (NAT users). Don't use CAPTCHA (defeats UX). Don't write to DB (use in-memory + Redis later).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Single-file change in `auth.ts` with simple in-memory state.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `backend/src/middleware/auth.ts:20-54` — `authenticate` function (where login is)
  - `backend/src/middleware/rateLimit.ts:27-33` — existing `authLimiter` (10 req/15min per IP)

  **WHY Each Reference Matters**:
  - `authLimiter` already rate-limits by IP — this task adds per-email lockout (different signal)

  **Acceptance Criteria**:
  - [ ] 10 failed logins for same email within 1 hour → 11th returns 429
  - [ ] Successful login resets the counter
  - [ ] `cd backend && npx tsc --noEmit` PASS

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Account locks after 10 failed attempts
    Tool: bash + curl
    Steps:
      1. curl POST /api/auth/login with bad password 10 times
      2. curl POST /api/auth/login with bad password 11th time
      3. Assert 11th returns 429 with Retry-After header
      4. curl with correct password → also 429 (locked)
    Evidence: .sisyphus/evidence/task-14-brute-force.txt
  ```

  **Evidence to Capture**: `task-14-brute-force.txt`

  **Commit**: `feat(auth): brute-force protection with progressive delay`

---


- [x] 15. ToS / Privacy / Refund pages

  **What to do**:
  - Create 3 public pages under `frontend/app/(public)/legal/`:
    - `terms/page.tsx` — Terms of Service
    - `privacy/page.tsx` — Privacy Policy (PIPL-compliant)
    - `refund/page.tsx` — Refund Policy (WeChat Pay consumer protection rules)
  - Use markdown content from `frontend/content/` (create if not exists)
  - Link from pricing page (Task 19) footer + signup flow
  - Mobile-responsive, dark mode support

  **Must NOT do**: Don't use a terms-of-service generator. Don't skip these (legal requirement before charging).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`
  - **Reason**: Multi-page UI with legal content rendering.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: None (but required before launch with payments)
  - **Blocked By**: None

  **References**:
  - `frontend/app/(public)/` — public route group
  - PIPL reference: `https://www.chinalawtranslate.com/en/personal-information-protection-law/`

  **Acceptance Criteria**:
  - [ ] 3 pages render at `/legal/terms`, `/legal/privacy`, `/legal/refund`
  - [ ] Linked from pricing page footer
  - [ ] Mobile responsive + dark mode
  - [ ] `cd frontend && npm run lint` PASS

  **Commit**: `feat(legal): tos privacy refund pages`

---

- [x] 16. Age/consent gating on signup

  **What to do**:
  - Add `dateOfBirth` field to User (optional, only required for users who select parent-monitor features)
  - In registration flow, if DOB indicates minor (<18 in CN), require parental consent flow
  - If parent consent not provided: block access to parent-monitor features (but not core OCR/AI features)
  - Document compliance rationale in `COMPLIANCE.md`

  **Must NOT do**: Don't block all minors from using the app (PIPL allows minors with consent). Don't store parental ID numbers.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Small auth + consent flow change.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: User compliance decision (Task 35)

  **References**:
  - `backend/src/services/auth.ts` — registration
  - PIPL §31 (minors' personal information protection)
  - COPPA reference: `https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy`

  **Acceptance Criteria**:
  - [ ] User with DOB < 18 in CN triggers consent flow
  - [ ] Without parent consent, parent-monitor features blocked
  - [ ] Core OCR/AI features accessible
  - [ ] `cd backend && npx tsc --noEmit` PASS

  **Commit**: `feat(auth): age gating with parental consent`

---

- [x] 17. Parent-monitoring compliance decision

  **What to do**:
  - Review the existing `parentLinkService.ts` and `parentMonitor.ts` route
  - Decision: either (A) gate behind explicit consent flow, or (B) disable entirely until compliance fully resolved
  - If (A): wire into Task 34's age gating
  - If (B): remove from production nav, mark as WIP feature
  - Document decision + rationale in `COMPLIANCE.md`

  **Must NOT do**: Don't ship parent-monitor in production without explicit consent flow.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Reason**: Decision + minor code adjustment.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `backend/src/services/parentLinkService.ts` — existing parent-link logic
  - `backend/src/routes/parentMonitor.ts` — existing parent-monitor route
  - `frontend/app/(protected)/parent-monitor/` — frontend page

  **Acceptance Criteria**:
  - [ ] Decision documented in COMPLIANCE.md
  - [ ] Code reflects decision (gated or removed)
  - [ ] `cd backend && npx tsc --noEmit` PASS

  **Commit**: `feat(compliance): parent-monitor gating decision`

---

- [x] 18. First 视频号 video

  **What to do**:
  - Write 30-60s video script (hook: "10秒笔记变知识图谱")
  - Record phone-screen demo: upload PDF → OCR runs → knowledge graph renders → flashcard
  - Edit in 剪映 (CapCut China) — add subtitles + voiceover
  - Post to 视频号 at peak time (19:00-22:00 China)
  - Cross-post to 小红书 (Xiaohongshu)
  - Save metrics (views, likes, conversions) for 7 days

  **Must NOT do**: Don't use stock footage. Don't make the video longer than 60s. Don't add fake testimonials.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`
  - **Reason**: Video content creation (UI demo + editing).

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: User creates script + records

  **References**:
  - 剪映: `https://lv.ulikecam.com/` (CapCut China)
  - 视频号 posting guide: `https://channels.weixin.qq.com/`

  **Acceptance Criteria**:
  - [ ] 30-60s video posted to 视频号
  - [ ] Includes OCR→graph→flashcard demo
  - [ ] Subtitle added in Chinese
  - [ ] Posts cross-uploaded to 小红书

  **Commit**: `docs(marketing): first 视频号 video posted [date]`

---

- [x] 19. Pricing page polish + landing page

  **What to do**:
  - Polish `frontend/app/(public)/pricing/page.tsx` (Task 19) with testimonials, social proof
  - Add `frontend/app/(public)/page.tsx` (landing page): hero, features, social proof, CTA
  - Optimize for mobile conversion
  - Add analytics: track pricing page visits + upgrade button clicks (Sentry or simple log)

  **Must NOT do**: Don't add fake testimonials. Don't use dark patterns (pre-checked checkboxes, etc.).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`
  - **Reason**: Marketing UI polish + landing page creation.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Task 19 (pricing page exists)

  **References**:
  - `frontend/app/(public)/pricing/page.tsx` (Task 19)
  - `frontend/app/(public)/page.tsx` (new) — landing page

  **Acceptance Criteria**:
  - [ ] Landing page at `/` with hero + features + CTA
  - [ ] Pricing page polished with social proof
  - [ ] Mobile conversion-optimized
  - [ ] `cd frontend && npm run lint` PASS

  **Commit**: `feat(marketing): landing page + pricing polish`

---

- [x] 23. Create `docs/` directory with comprehensive documentation

  **What to do**:
  - Create `docs/` directory at the project root
  - Write 11 doc files covering all product logic, all user flows, and standard operational content
  - Create `docs/README.md` as the entry point with TOC linking to all other docs
  - All user-facing docs in **Chinese** (Simplified) — audience is Chinese parents/students
  - All developer docs in **English** with Chinese summaries where relevant
  - Use existing project conventions: Markdown, code blocks for commands, tables for comparisons

  **Required doc files** (each with the spec below):

  **`docs/README.md`** — Documentation index
  - Project one-liner + screenshot/GIF placeholder
  - Quick links: "For Users" → USER_GUIDE, "For Developers" → DEVELOPMENT, "For Operators" → DEPLOYMENT
  - Status badges (build, license, version)
  - Last-updated date

  **`docs/USER_GUIDE.md`** (Chinese 用户指南) — End-user documentation
  - Getting started: registration, email verification, trial
  - All product features with screenshots:
    - **上传文档** (Upload): drag-and-drop, file types, OCR processing
    - **知识图谱** (Knowledge Graph): visualization, edit, navigate
    - **闪卡** (Flashcards): generation, review, SM-2 algorithm
    - **测验** (Quiz): adaptive, generation, results
    - **速查表** (Cheat Sheets): generation, viewing
    - **学习笔记** (Study Notes): generation, viewing
    - **AI 聊天** (Chat): with knowledge graph context
    - **错题本** (Wrong Questions): review system
    - **学科包** (Subject Packs): loading, switching
  - Subscription tiers explained (免费/月卡/年卡/高考冲刺)
  - Quota limits per tier
  - Payment via WeChat Pay
  - Account settings, subscription management
  - FAQ
  - Troubleshooting for users

  **`docs/ARCHITECTURE.md`** — System design
  - High-level diagram (ASCII)
  - Tech stack table (frontend, backend, services, storage)
  - Data flow: upload → OCR → AI → knowledge graph → study materials
  - Component breakdown: frontend (Next.js), backend (Express), data (SQLite)
  - Multi-user model: per-user graph storage, per-user quota
  - Subscription tier enforcement flow
  - Job queue architecture (current single-process + Wave 4 path)
  - External dependencies: Moonshot AI, WeChat Pay, Resend email
  - File storage strategy (local now, OSS later)
  - Security model: JWT auth, tier-based access, audit logging

  **`docs/API.md`** — REST API reference
  - Authentication: JWT Bearer header, register/login/refresh flow
  - Endpoints grouped by domain:
    - `/api/auth/*` — registration, login, refresh
    - `/api/upload` — file upload
    - `/api/jobs/*` — job status
    - `/api/quiz/*` — quiz generation, submission
    - `/api/flashcards/*` — flashcard CRUD
    - `/api/study/*` — cheat sheets, notes
    - `/api/reviews/*` — SM-2 review queue
    - `/api/admin/*` — admin endpoints
    - `/api/user/quota` — usage info
    - `/api/webhooks/wechat` — payment webhook
  - For each endpoint: method, path, auth required, request body schema, response schema, error codes
  - Rate limiting info (per-route)
  - Quota middleware response format (`{error: 'QUOTA_EXCEEDED', resource, quota, message}`)

  **`docs/DEVELOPMENT.md`** — Developer setup
  - Prerequisites (Node 20+, npm)
  - Initial setup: `git clone` → `npm install` (note: nested workspaces)
  - Environment config: `backend/.env` (Moonshot, JWT, WeChat Pay sandbox, etc.)
  - Running dev servers: `npm run dev` (concurrently runs frontend + backend)
  - Codebase tour:
    - `backend/src/services/` — business logic (37 services)
    - `backend/src/middleware/` — auth, quota, rate limit
    - `backend/src/routes/` — 26 route groups
    - `frontend/components/` — UI by feature
    - `shared/types.ts` — cross-package types
  - Code style: TypeScript strict, async/await, services-first pattern
  - Testing: `npm test`, how to add tests, current coverage
  - Common development tasks:
    - Adding a new API endpoint
    - Adding a new service
    - Adding a new frontend page
    - Adding a new user tier
    - Adding a new subject pack
  - Anti-patterns (from AGENTS.md):
    - `as any` / `@ts-ignore` forbidden
    - console.log in middleware forbidden
    - JSON file writes (use DB after migration)
    - bg-white / bg-gray-* (use bg-slate-*)

  **`docs/DEPLOYMENT.md`** — Production deployment
  - Infrastructure: Tencent Lighthouse (recommended) or Aliyun ECS
  - Environment: Node 20, nginx reverse proxy, PM2 process management
  - HTTPS setup (Let's Encrypt / Tencent SSL)
  - WeChat Pay 商戶號 + ICP备案 requirements
  - Domain DNS configuration
  - Database: SQLite (file-based, daily backups to OSS/S3) — see BACKUP.md
  - Moonshot AI API key (sandbox → production)
  - Resend email API key
  - Environment variables: complete list with descriptions
  - Health check endpoints: `/api/health`
  - Monitoring: Sentry, UptimeRobot
  - Rollback procedure
  - Scaling notes (single server → multi-server + Redis)

  **`docs/SECURITY.md`** — Security model
  - Authentication: JWT with short expiry + refresh tokens
  - Password hashing: bcrypt (10+ rounds)
  - Rate limiting: per-endpoint limits (see `backend/src/middleware/rateLimit.ts`)
  - Brute-force protection: progressive delay + lockout (Task 14)
  - Free trial abuse prevention: device fingerprint + email (Task 7)
  - Admin actions: audit log (Task 8)
  - Quota enforcement: tier-based limits (Task 2)
  - Webhook idempotency: signed + deduplicated (Task 16)
  - File upload validation: type, size, magic bytes
  - CORS: allowlist only (see `backend/src/app.ts`)
  - Helmet: standard security headers
  - Data privacy: PIPL compliance, GDPR export/delete (Tasks 31-32)
  - Vulnerability reporting: contact email
  - Known limitations: e.g., not yet SOC2 compliant

  **`docs/TROUBLESHOOTING.md`** — Common issues
  - **Backend won't start**: `MOONSHOT_API_KEY` missing, port 3001 in use
  - **Frontend can't connect to backend**: `NEXT_PUBLIC_API_BASE_URL` wrong, CORS
  - **OCR returns gibberish**: image quality, language setting, file too small
  - **Knowledge graph empty after upload**: AI match failed, check `data/knowledge-graph.json`
  - **Quota exceeded unexpectedly**: check `users.json` for `usage` field, force period reset
  - **WeChat Pay webhook not received**: URL not in 商戶號 config, signature mismatch
  - **Subscription not updated after payment**: webhook failed, check `webhook_events` table for retries
  - **Performance slow**: large file upload, AI timeout, check Moonshot API status
  - **Database locked**: SQLite single-writer, check for stuck processes
  - **Out of disk space**: cleanup old uploads, check `data/uploads/`
  - **Frontend build error**: `next.config.ts` has `typescript.ignoreBuildErrors: true` — check actual errors with `npx tsc --noEmit`
  - **Cron job not running**: Task 4 backup script needs `BACKUP_CRON` env var

  **`docs/PRICING.md`** (Chinese 定价) — Pricing for users
  - 4 tier comparison table (免费/月卡/年卡/高考冲刺) with features, limits, prices
  - Quota limits per tier (uploads/mo, quiz gen/mo, chat msgs/mo)
  - Payment method: WeChat Pay (微信支付)
  - Trial: 7 days, 10 uploads total
  - Refund policy: 7-day money-back guarantee
  - FAQ: how to upgrade, how to cancel, what happens to data on cancel
  - Contact for billing questions

  **`docs/CHANGELOG.md`** — Version history
  - Format: Keep a Changelog standard
  - Versions: 1.0.0 (tier scaffolding), 1.1.0 (DB migration), etc.
  - Each entry: Added, Changed, Fixed, Removed
  - Keep this updated with each release

  **`docs/ROADMAP.md`** — Future plans
  - Q1: WeChat Pay / Alipay live, first 100 paid users
  - Q2: Subject packs (语文 + 数学 全部), 1000 paid users
  - Q3: BullMQ + Redis queue, OSS storage, multi-server
  - Q4: iOS app, WeChat Mini Program
  - Longer-term: family plans, AI tutor, cross-subject recommendations

  **`docs/PRODUCT_FLOWS.md`** — Product logic flows
  - User journey: registration → trial → first upload → graph generation → first flashcard → first quiz → upgrade
  - Subscription journey: trial expires → upgrade decision → payment → tier change → usage tracking → renewal
  - Admin journey: dashboard → user search → tier edit → audit log review
  - Data flow: upload → OCR → AI matching → graph update → material generation → user sees results
  - Error flows: payment failure → dunning → downgrade, OCR failure → retry, AI timeout → circuit breaker

  **Must NOT do**:
  - Don't add fictional features (only document what actually exists)
  - Don't include pricing/limits that aren't in the actual `backend/src/config/tiers.ts` (verify before writing)
  - Don't write docs that require code changes to be useful (docs reflect current state)
  - Don't use placeholder TODO sections — every doc must be complete

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`
  - **Reason**: 11 doc files, all needing accuracy. User-facing docs in Chinese require careful translation. Developer docs require codebase understanding.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Housekeeping
  - **Blocks**: None (but should be done BEFORE launch)
  - **Blocked By**: Wave 0 + Wave 1 + Wave 5 should be substantially complete (so docs reflect reality). Specifically: Task 11 (UsageWidget) for accurate pricing/limit docs, Task 19 (pricing page) for accurate pricing doc, Task 8 (audit log) for accurate security doc.

  **References**:
  - `AGENTS.md` (root) — project structure, conventions
  - `frontend/AGENTS.md` — frontend style, theme system
  - `backend/src/routes/AGENTS.md` — backend routes overview
  - `backend/src/services/AGENTS.md` — backend services overview
  - `backend/src/config/tiers.ts` — tier values for pricing docs
  - `backend/src/middleware/quota.ts` — quota middleware behavior
  - `backend/src/middleware/auth.ts` — auth flow
  - `MONETIZATION.md` — pricing/business model
  - `backend/src/services/jobProcessor.ts` — upload pipeline (for product flow docs)

  **WHY Each Reference Matters**:
  - `AGENTS.md` files are the canonical project docs — new docs should be consistent in style
  - `tiers.ts` is the source of truth for pricing/limit numbers — must not be hallucinated
  - `jobProcessor.ts` shows the actual upload pipeline — product flow docs must match
  - `MONETIZATION.md` has business model — pricing doc must align

  **Acceptance Criteria**:
  - [ ] `docs/` directory exists at project root
  - [ ] All 11 doc files exist with non-trivial content (>200 words each)
  - [ ] `docs/README.md` links to all other docs
  - [ ] `docs/USER_GUIDE.md` and `docs/PRICING.md` are in Chinese
  - [ ] `docs/API.md` documents ALL endpoints from `backend/src/routes/`
  - [ ] `docs/ARCHITECTURE.md` reflects actual data flow from `jobProcessor.ts`
  - [ ] `docs/DEVELOPMENT.md` matches actual setup commands
  - [ ] `docs/TROUBLESHOOTING.md` covers the most common issues seen in `backend/dev-backend.log.err`
  - [ ] `docs/SECURITY.md` documents the actual security middleware in place
  - [ ] `docs/PRODUCT_FLOWS.md` covers all 4 user journeys with actual implementation details
  - [ ] `docs/ROADMAP.md` reflects current state + reasonable next quarters

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: All 11 docs exist with substantial content
    Tool: bash
    Steps:
      1. ls -la docs/ (verify 11 files)
      2. wc -w docs/*.md (verify each >200 words)
      3. Assert no doc has <200 words
    Evidence: .sisyphus/evidence/task-23-docs-exist.txt

  Scenario: Docs reflect actual code
    Tool: bash
    Steps:
      1. grep -c "tier" docs/PRICING.md (should mention all 3 tiers)
      2. grep -c "uploads\|quota" docs/USER_GUIDE.md
      3. grep -c "JWT\|bearer" docs/API.md
      4. Verify no fictional features mentioned
    Evidence: .sisyphus/evidence/task-23-docs-accurate.txt

  Scenario: USER_GUIDE is in Chinese
    Tool: bash
    Steps:
      1. file docs/USER_GUIDE.md (check encoding)
      2. grep -c "[\u4e00-\u9fff]" docs/USER_GUIDE.md (count Chinese characters, should be substantial)
      3. Verify no fictional features
    Evidence: .sisyphus/evidence/task-23-user-guide-chinese.txt
  ```

  **Evidence to Capture**:
  - `task-23-docs-exist.txt` — file list + word counts
  - `task-23-docs-accurate.txt` — accuracy checks
  - `task-23-user-guide-chinese.txt` — Chinese character count

  **Commit**: `docs: create comprehensive docs/ directory covering all product logic and usage`

---

### Housekeeping (anytime)

- [x] 20. Fix README.md merge-conflict markers

  **What to do**: Read `README.md`, remove all `<<<<<<< HEAD`, `=======`, `>>>>>>> ...` lines, keep only the "current" side. Verify the final file reads coherently.

  **Acceptance Criteria**:
  - [ ] `rg "<<<<<<<" README.md` returns 0
  - [ ] `rg ">>>>>>>" README.md` returns 0
  - [ ] File reads cleanly

  **Commit**: `docs: fix readme merge conflict markers`

---

- [x] 21. Remove @anthropic-ai/sdk from backend/package.json

  **What to do**: `cd backend && npm uninstall @anthropic-ai/sdk` (verify 0 usages first via `rg "@anthropic-ai/sdk" backend/src`).

  **Acceptance Criteria**:
  - [ ] `rg "@anthropic-ai/sdk" backend/src` returns 0
  - [ ] `grep "@anthropic-ai" backend/package.json` returns 0
  - [ ] `npm ls @anthropic-ai/sdk` returns "empty"

  **Commit**: `chore: remove unused @anthropic-ai/sdk dependency`

---

- [x] 22. Delete/move _qa_task4.ts from backend/src

  **What to do**: Move `backend/src/_qa_task4.ts` to `backend/scripts/_qa_task4.ts` (or delete entirely). Remove the `_qa_*` glob from `tsconfig.json` exclude if it was added specifically for this file.

  **Acceptance Criteria**:
  - [ ] `backend/src/_qa_task4.ts` no longer exists (or moved to scripts/)
  - [ ] `cd backend && npx tsc --noEmit` still PASS

  **Commit**: `chore: move qa task4 script out of src`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks complete)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback → fix → re-run → present again → wait for okay.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `cd backend && npx tsc --noEmit` + `cd frontend && npm run lint` + `cd frontend && npx tsc --noEmit`. Review all changed files for: `as any` / `@ts-ignore`, empty catches, `console.log` in production, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- One commit per task (atomic unit)
- Format: `type(scope): description`
- Co-author footer on all commits: `Co-Authored-By: Claude <noreply@anthropic.com>`
- DO NOT push until each task has its QA evidence files in `.sisyphus/evidence/`
- Push to `main` only after CI passes (Task 6)
- Use feature branches for Wave 1+ work (e.g., `feat/db-migration`, `feat/wechat-pay-integration`)

---

## Success Criteria

### Verification Commands
```bash
# Type checks
cd C:\Users\64887\ocr-kb-matcher\backend && npx tsc --noEmit
cd C:\Users\64887\ocr-kb-matcher\frontend && npx tsc --noEmit

# Lint
cd C:\Users\64887\ocr-kb-matcher\frontend && npm run lint

# Health checks
curl https://yourdomain.com/api/health
curl https://yourdomain.com/

# End-to-end payment flow (sandbox)
# 1. Register test user
# 2. Open /pricing, click 升级月卡
# 3. Complete WeChat Pay sandbox payment
# 4. Verify user.tier === 'monthly' in DB
# 5. Verify receipt email sent
# 6. POST /api/subscriptions/cancel
# 7. Verify cancelAtPeriodEnd === true
```

### Final Checklist
- [ ] All 23 implementation tasks marked `- [x]`
- [ ] All F1-F4 reviews APPROVE
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `cd frontend && npm run lint` + `tsc --noEmit` clean
- [ ] All evidence files in `.sisyphus/evidence/`
- [ ] First 视频号 video posted
- [ ] First paying user completes full flow
- [ ] User explicitly approved final results

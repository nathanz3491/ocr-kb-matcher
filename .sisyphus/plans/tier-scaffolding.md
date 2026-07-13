# Tier Scaffolding Implementation

## TL;DR

> **Quick Summary**: Implement per-user tier-based quota enforcement (free / monthly / yearly) for uploads, quiz generation, and chat messages. Includes login enforcement on quota-protected routes, admin role + routes for manual tier management, subscription-anniversary-based period reset, frontend usage display, and the SM-2 review queue auto-population fix. **No payment integration** — this is the enforcement + admin layer only.
>
> **Deliverables**:
> - Tier config + quota middleware enforcing per-tier monthly caps
> - 6 routes gated by `requireAuth` + `enforceQuota`
> - `/api/user/quota` read-only endpoint for frontend display
> - Admin routes + role for manual tier management
> - Frontend `<UsageWidget />` on dashboard
> - Frontend `/admin` page with user table
> - `lib/api.ts` 429 quota-exceeded handling with upgrade CTA
> - SM-2 review queue auto-initialization on upload (engagement flywheel fix)
>
> **Estimated Effort**: 5-7 days solo
> **Parallel Execution**: YES — 3 implementation waves + 1 final verification wave
> **Critical Path**: Wave 1 data model → Wave 2 route integration → Wave 3 frontend → Final reviews

---

## Context

### Original Request
User confirmed the corrected pricing model (free trial → free → monthly ¥19 → yearly ¥198 → gaokao 冲刺 ¥99 seasonal) and chose:
1. **Block guests, force login** on quota-protected routes
2. **Reset on subscription anniversary** (not universal 1st-of-month)
3. **Admin routes + admin role** (not CLI-only)
4. **Full scaffolding scope** (not backend-only or minimal slice)

### Interview Summary
**Key Decisions** (from prior discussion):
- Per-user isolation already implemented via `getKnowledgeGraphStorage(userId)` → `knowledge-graph-{userId}.json`
- Study materials (flashcards, cheat sheets, study notes) are auto-generated as part of upload pipeline, not separate user-triggered operations
- SM-2 review is pure file lookup (no AI cost) — but uploads don't currently populate the review queue (gap to fix)
- Quiz generation and chat are separate user-triggered AI costs
- AI cost per typical upload: ¥0.30-0.40 (Moonshot v1-8k pricing: ¥2/M input, ¥10/M output)
- 4 tiers chosen: free, monthly, yearly, gaokao-冲刺 (gaokao pack is a later addition, not in v1)

**Research Findings**:
- `moonshot-v1-8k` is the actual model in use (`backend/.env.example:19`)
- `copyDefaultGraphToUser(userId)` already exists for per-user graph seeding (`knowledgeGraphStorage.ts:702`)
- Per-user JSON files pattern: `reviews-{userId}.json`, `user-progress-{userId}.json`, `flashcards-{userId}/`, `cheat-sheets-{userId}/`, `study-notes-{userId}/`
- `optionalAuth` middleware exists but allows guest access — need stricter `requireAuth` for value actions

### Metis Review
**Identified Gaps** (addressed in plan):
- Race conditions on simultaneous uploads: accept risk, matches existing rate-limit pattern
- Failed operation quota refund: not implementing, matches existing pattern
- Subscription expiry during active session: lazy check on next request
- Existing rate limit middleware coexistence: both must pass (stacking)
- Yearly subscriber mid-month: gets partial first month, then annual cycle (acceptable, simpler than prorating)

---

## Work Objectives

### Core Objective
Add tier-based quota enforcement to the existing app so the user can launch paid tiers (manually managed for now) without risking AI cost overruns, while completing the engagement flywheel by populating the SM-2 review queue on upload.

### Concrete Deliverables
- New file: `backend/src/config/tiers.ts` (single source of truth for tier limits)
- New file: `backend/src/middleware/quota.ts` (enforcement middleware)
- Modified: `backend/src/middleware/auth.ts` (add `requireAuth`, `requireAdmin`)
- New file: `backend/src/routes/admin.ts` (5 admin routes)
- Modified: `backend/src/routes/upload.ts`, `routes/quiz.ts`, `routes/chat.ts` (apply middleware)
- Modified: `backend/src/routes/userSettings.ts` (add `/api/user/quota`)
- Modified: `backend/src/routes/index.ts` (mount admin)
- Modified: `backend/src/services/jobProcessor.ts` (SM-2 fix)
- Modified: `backend/src/services/userService.ts` (role helpers, defaults)
- Modified: `shared/types.ts` (extend User, add Tier type)
- New: `frontend/components/dashboard/UsageWidget.tsx`
- New: `frontend/app/(protected)/admin/page.tsx`
- Modified: `frontend/app/(protected)/dashboard/page.tsx` (mount widget)
- Modified: `frontend/lib/api.ts` (handle 429)

### Definition of Done
- [ ] Free user with empty `usage` object can perform actions up to tier cap, then gets 429
- [ ] Manual tier change via admin route immediately takes effect on next request
- [ ] Monthly subscription resets counters exactly 30 days after `subscriptionStartedAt` (same day-of-month)
- [ ] Yearly subscription resets counters exactly 365 days after `subscriptionStartedAt`
- [ ] Free user counters reset on 1st of each UTC month
- [ ] Subscription expiry past `subscriptionExpiresAt` reverts user to `free` tier on next request
- [ ] Uploading documents auto-populates `/api/reviews/due` for that user
- [ ] Frontend `<UsageWidget />` shows current usage with progress bars
- [ ] Admin route `/api/admin/users` returns user list with `tier`, `usage`, expiry
- [ ] `requireAdmin` middleware returns 403 for non-admin users
- [ ] TypeScript compiles cleanly: `cd backend && npx tsc --noEmit` and `cd frontend && npx tsc --noEmit`
- [ ] ESLint passes: `cd frontend && npm run lint`

### Must Have
- Tier enforcement working end-to-end (real 429s on cap exceeded)
- Admin can manually upgrade/downgrade any user
- Frontend displays current usage to user
- SM-2 review queue populates on upload
- Lazy month rollover (no cron jobs)
- Login required for upload/quiz/chat

### Must NOT Have (Guardrails)
- ❌ No payment integration (WeChat Pay, Stripe) — out of scope
- ❌ No WeChat Mini Program — out of scope
- ❌ No iOS app — out of scope
- ❌ No 高考冲刺 pack tier — defer to v2 when payments exist
- ❌ No full-text "AI slop" comments in new code
- ❌ No `as any` / `@ts-ignore` to suppress type errors
- ❌ No background services or cron jobs for rollover (use lazy evaluation)
- ❌ No modifications to `routes/types.ts` (stale duplicate, not canonical)
- ❌ No race-condition locking (accept the small risk, document it)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (test scripts exist in `backend/src/tests/` but not wired to `npm test`)
- **Automated tests**: None for v1 of tier scaffolding
- **Framework**: None — verification is manual via curl + frontend via Playwright
- **Agent-Executed QA**: ALWAYS — every task includes concrete scenarios

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use `curl` or `Bash` — send requests, assert status + response fields
- **Frontend UI**: Use `playwright` skill (or `dev-browser`) — navigate, assert DOM, screenshot
- **DB state inspection**: Use `Bash` to read `backend/data/users.json` after operations

### Tier Enforcement Verification
After implementation, agent MUST verify all of:
1. Free user, 3 sequential uploads → first 2 succeed, 3rd returns 429 with `QUOTA_EXCEEDED` body
2. Admin promotes user to `monthly` → next upload succeeds
3. User on `monthly` uploads 16 times → 16th returns 429
4. Manipulate `user.usage.periodStart` to past date → next request resets counters
5. Set `subscriptionExpiresAt` to past date → next request reverts to `free`
6. Anonymous request to `/api/upload` → 401 `AUTH_REQUIRED`
7. Non-admin request to `/api/admin/users` → 403

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation, parallel-safe):
├── Task 1: Shared types + tier config + month helpers [quick]
├── Task 2: Auth middleware extensions (requireAuth, requireAdmin) [quick]
├── Task 3: Quota middleware (full impl) [unspecified-high]
└── Task 4: User service role + admin bootstrap helpers [quick]

Wave 2 (After Wave 1 - route integration, MAX PARALLEL):
├── Task 5: Apply requireAuth + enforceQuota to upload route [quick]
├── Task 6: Apply to quiz routes (3 endpoints) [quick]
├── Task 7: Apply to chat routes (2 endpoints) [quick]
├── Task 8: /api/user/quota read-only endpoint [quick]
├── Task 9: Admin routes (5 endpoints) [unspecified-high]
└── Task 10: SM-2 review init fix in jobProcessor [quick]

Wave 3 (After Wave 2 - frontend, parallel-safe):
├── Task 11: UsageWidget component [visual-engineering]
├── Task 12: Dashboard integration [quick]
├── Task 13: Admin page (table view) [visual-engineering]
└── Task 14: lib/api.ts 429 handling with upgrade CTA [quick]

Wave FINAL (After ALL tasks - 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle) [unspecified-high]
├── Task F2: Code quality review (unspecified-high) [unspecified-high]
├── Task F3: Real manual QA (execute all QA scenarios) [unspecified-high]
└── Task F4: Scope fidelity check (deep) [deep]

Critical Path: Task 1 → Task 3 → Task 5 → Task 8 → Task 11 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1), 6 (Wave 2), 4 (Wave 3)
```

### Dependency Matrix (abbreviated)

- **1-4**: - - 5-10, 1
- **3**: 1, 2, 4 - 5-7, 1
- **8**: 3, 4 - 11, 1
- **9**: 2, 4 - 13, 1
- **11**: 8 - 12, 1
- **13**: 9 - F1-F4, 1

### Agent Dispatch Summary

- **Wave 1**: 4 quick/unspecified-high tasks
- **Wave 2**: 4 quick + 1 unspecified-high (admin routes)
- **Wave 3**: 2 visual-engineering + 2 quick
- **Wave FINAL**: 1 oracle + 2 unspecified-high + 1 deep

---

## TODOs

> Implementation = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [x] 1. Shared types + tier config + period helpers

  **What to do**:
  - Add `Tier` type to `shared/types.ts`: `type Tier = 'free' | 'monthly' | 'yearly';`
  - Extend `User` interface in `shared/types.ts`: add `tier: Tier`, `subscriptionStartedAt?: string`, `subscriptionExpiresAt?: string`, `role: 'user' | 'admin'`, `usage: { periodStart: string; uploads: number; quizGenerated: number; chatMessages: number; }`
  - Create `backend/src/config/tiers.ts` with `TIER_LIMITS` Record mapping each tier to `{ uploads, quizGenerated, chatMessages }` numbers per locked plan
  - Export `getCurrentMonthStart()` helper that returns ISO date string for 1st of current UTC month
  - Export `isCurrentPeriod(user, now)` helper implementing the anniversary logic: free → 1st of month, monthly → +1 month from `periodStart`, yearly → +1 year from `periodStart`
  - Export `nextAnniversaryDate(subscriptionStartedAt, tier, now)` helper computing when the next period starts

  **Must NOT do**:
  - Don't add a `gaokao` tier yet (deferred to v2)
  - Don't import Express in tier config (keep it pure)
  - Don't hardcode tier limits anywhere else — config is single source of truth

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Data model + small helpers, no complex logic
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `fullstack`: Not needed — backend-only data layer work
    - `component-engineering`: Not UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 3, 5, 6, 7, 8, 9, 11
  - **Blocked By**: None (can start immediately)

  **References**:
  - **Pattern References**: `shared/types.ts:1-50` (existing User interface shape) — match the style
  - **API/Type References**: `shared/types.ts` (canonical shared types) — extend this, NOT `backend/src/routes/types.ts` (stale duplicate)
  - **External References**: `Date.UTC()`, `Date.prototype.setUTCMonth()`, `Date.prototype.setUTCFullYear()` — MDN docs for the anniversary math

  **WHY Each Reference Matters**:
  - Existing User interface shows the pattern for optional fields, naming conventions, and JSDoc style — match it exactly
  - The `routes/types.ts` file is a known stale duplicate (per AGENTS.md) — don't touch it
  - UTC date methods are critical for avoiding timezone bugs in anniversary calculations

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS (no type errors)
  - [ ] New tier values match: `free: { uploads: 2, quizGenerated: 3, chatMessages: 20 }`, `monthly: { uploads: 15, quizGenerated: 30, chatMessages: 100 }`, `yearly: { uploads: 15, quizGenerated: 30, chatMessages: 100 }`

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: isCurrentPeriod returns true for fresh free user in same month
    Tool: Bash (node REPL)
    Preconditions: New User object with tier='free', periodStart=ISO date of 1st of current month
    Steps:
      1. Open node REPL, import isCurrentPeriod
      2. Call isCurrentPeriod(user, new Date())
      3. Assert result === true
    Expected Result: true
    Evidence: .sisyphus/evidence/task-1-period-free-same-month.txt

  Scenario: isCurrentPeriod returns false for free user in new month
    Tool: Bash (node REPL)
    Preconditions: User with periodStart from previous month
    Steps:
      1. Create user with periodStart = ISO date of 1st of last month
      2. Call isCurrentPeriod(user, new Date())
      3. Assert result === false
    Expected Result: false
    Evidence: .sisyphus/evidence/task-1-period-free-new-month.txt

  Scenario: nextAnniversaryDate for monthly sub +30 days
    Tool: Bash (node REPL)
    Preconditions: subscriptionStartedAt = July 11, 2026, tier='monthly', now = July 25
    Steps:
      1. Call nextAnniversaryDate('2026-07-11', 'monthly', new Date('2026-07-25'))
      2. Assert result is on Aug 11, 2026
    Expected Result: Date representing Aug 11, 2026
    Evidence: .sisyphus/evidence/task-1-anniv-monthly.txt

  Scenario: nextAnniversaryDate for yearly sub +365 days
    Tool: Bash (node REPL)
    Preconditions: subscriptionStartedAt = July 11, 2026, tier='yearly', now = July 25
    Steps:
      1. Call nextAnniversaryDate('2026-07-11', 'yearly', new Date('2026-07-25'))
      2. Assert result is on July 11, 2027
    Expected Result: Date representing July 11, 2027
    Evidence: .sisyphus/evidence/task-1-anniv-yearly.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 2. Auth middleware extensions (requireAuth, requireAdmin)

  **What to do**:
  - Add `requireAuth` middleware to `backend/src/middleware/auth.ts`: returns 401 with `{ success: false, error: 'AUTH_REQUIRED', message: '请登录后使用此功能' }` if `req.user?.userId` is missing
  - Add `requireAdmin` middleware: returns 403 if user is not admin (checks `req.user.role === 'admin'` OR email in `process.env.ADMIN_EMAILS` comma-separated list)
  - Ensure `req.user` is properly typed via global Express namespace augmentation if needed (or inline `any` cast acceptable for now)
  - Update existing `optionalAuth` (don't break it) — it should still allow guest access for read-only routes

  **Must NOT do**:
  - Don't replace `optionalAuth` — both middlewares coexist
  - Don't add role checks to `optionalAuth` — keep it pure
  - Don't add per-route admin checks — use the middleware

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small middleware additions, clear pattern from existing `optionalAuth`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `security-express`: Could be relevant but the patterns are simple middleware additions, no security audit needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 6, 7, 9, 13
  - **Blocked By**: None

  **References**:
  - **Pattern References**: `backend/src/middleware/auth.ts` (existing `optionalAuth` implementation) — mirror the structure
  - **API/Type References**: `shared/types.ts` User interface with `role` field added in Task 1

  **WHY Each Reference Matters**:
  - `optionalAuth` shows the exact pattern for reading JWT and attaching `req.user` — `requireAuth` and `requireAdmin` build on this

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] `requireAuth` returns 401 when no auth header present
  - [ ] `requireAuth` calls `next()` when valid JWT present
  - [ ] `requireAdmin` returns 403 for non-admin user (even with valid JWT)
  - [ ] `requireAdmin` calls `next()` when user has `role: 'admin'` OR email in `ADMIN_EMAILS` env var

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: requireAuth blocks unauthenticated request
    Tool: Bash (curl)
    Preconditions: Test route protected with requireAuth, server running
    Steps:
      1. curl -X POST http://localhost:3001/api/upload -F "file=@test.txt"
      2. Assert status === 401
      3. Assert response body has error: 'AUTH_REQUIRED'
    Expected Result: 401 status with AUTH_REQUIRED error code
    Evidence: .sisyphus/evidence/task-2-requireauth-block.txt

  Scenario: requireAuth allows authenticated request
    Tool: Bash (curl)
    Preconditions: Test route protected with requireAuth, valid JWT in Authorization header
    Steps:
      1. curl -X POST http://localhost:3001/api/upload -H "Authorization: Bearer $TOKEN" -F "file=@test.txt"
      2. Assert status !== 401 (either 200, 429, or other — but not 401)
    Expected Result: Passes through to route handler
    Evidence: .sisyphus/evidence/task-2-requireauth-pass.txt

  Scenario: requireAdmin blocks regular user
    Tool: Bash (curl)
    Preconditions: Test route protected with requireAdmin, JWT for non-admin user
    Steps:
      1. curl http://localhost:3001/api/admin/users -H "Authorization: Bearer $USER_TOKEN"
      2. Assert status === 403
    Expected Result: 403 Forbidden
    Evidence: .sisyphus/evidence/task-2-requireadmin-block.txt

  Scenario: requireAdmin allows admin user
    Tool: Bash (curl)
    Preconditions: JWT for user with role='admin' OR email in ADMIN_EMAILS env var
    Steps:
      1. curl http://localhost:3001/api/admin/users -H "Authorization: Bearer $ADMIN_TOKEN"
      2. Assert status === 200
    Expected Result: 200 OK
    Evidence: .sisyphus/evidence/task-2-requireadmin-allow.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 3. Quota middleware (full implementation)

  **What to do**:
  - Create `backend/src/middleware/quota.ts` exporting `enforceQuota(resource: 'uploads' | 'quizGenerated' | 'chatMessages')` factory
  - Implementation: require auth, get user, check tier expiry (lazy downgrade to free if past `subscriptionExpiresAt`), check period rollover (reset counters if `!isCurrentPeriod(user, now)`), check `usage[resource] >= TIER_LIMITS[tier][resource]` and return 429, otherwise increment and persist, then `next()`
  - 429 response shape: `{ success: false, error: 'QUOTA_EXCEEDED', resource, quota: { used, limit, tier, resetsAt }, message: '本月{资源}额度已用完（{used}/{limit}）。升级套餐获取更多额度。' }`
  - Attach `req.quotaInfo = { tier, resource, used, limit }` for downstream logging
  - Include Chinese resource labels: uploads='上传', quizGenerated='测验生成', chatMessages='AI 聊天'

  **Must NOT do**:
  - Don't lock the file write (accept race risk, document it)
  - Don't refund quota on operation failure (matches existing rate-limit pattern)
  - Don't add retry logic — let the route handle retries
  - Don't add caching of user objects — always re-read from disk

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core enforcement logic with multiple edge cases (tier expiry, period rollover, lazy downgrade)
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `security-express`: Could audit, but the pattern is standard middleware

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 5, 6, 7
  - **Blocked By**: Tasks 1, 2 (types + auth middleware must exist first)

  **References**:
  - **Pattern References**: `backend/src/middleware/rateLimit.ts:1-76` (existing rate limit pattern) — follow the same factory function style
  - **API/Type References**: `TIER_LIMITS` from Task 1's `backend/src/config/tiers.ts`, `User` from `shared/types.ts`

  **WHY Each Reference Matters**:
  - `rateLimit.ts` is the established middleware pattern in this codebase — match its style
  - TIER_LIMITS and User types are the contracts this middleware enforces against

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] First call within tier cap → passes through
  - [ ] Call that would exceed cap → returns 429 with full quota info in response
  - [ ] User with past `subscriptionExpiresAt` → tier downgraded to free, counters reset
  - [ ] User with stale `usage.periodStart` → counters reset to 0, `periodStart` updated

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Free user hits upload cap (2/mo)
    Tool: Bash (curl)
    Preconditions: Server running, test user with tier='free', fresh usage
    Steps:
      1. POST /api/upload with valid JWT (1st upload) → 200
      2. POST /api/upload with valid JWT (2nd upload) → 200
      3. POST /api/upload with valid JWT (3rd upload) → 429
      4. Assert 429 response body has quota.used=2, quota.limit=2, quota.tier='free'
    Expected Result: 429 with QUOTA_EXCEEDED body
    Evidence: .sisyphus/evidence/task-3-quota-free-cap.txt

  Scenario: Lazy tier downgrade on expired subscription
    Tool: Bash (curl)
    Preconditions: User with tier='monthly', subscriptionExpiresAt in past
    Steps:
      1. Read backend/data/users.json, set user's subscriptionExpiresAt to yesterday
      2. POST /api/upload with valid JWT
      3. Read backend/data/users.json again
      4. Assert user.tier is now 'free', subscriptionExpiresAt is undefined
      5. Assert usage was reset to 0 (free tier has its own period)
    Expected Result: User auto-downgraded, counters reset
    Evidence: .sisyphus/evidence/task-3-tier-downgrade.txt

  Scenario: Lazy period rollover
    Tool: Bash (node + curl)
    Preconditions: User with usage.uploads=2, usage.periodStart from last month
    Steps:
      1. Manually edit user JSON to set periodStart to first of last month, uploads=2
      2. POST /api/upload with valid JWT
      3. Read user JSON
      4. Assert usage.uploads is now 1 (not 3)
      5. Assert usage.periodStart is first of current month
    Expected Result: Counters reset on new period
    Evidence: .sisyphus/evidence/task-3-period-rollover.txt

  Scenario: Quota response includes Chinese message
    Tool: Bash (curl)
    Preconditions: Free user at upload cap
    Steps:
      1. Trigger 429
      2. Assert response.body.message contains '上传' (Chinese for upload)
    Expected Result: Message is in Chinese
    Evidence: .sisyphus/evidence/task-3-quota-message.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 4. User service: role helpers + admin bootstrap

  **What to do**:
  - In `backend/src/services/userService.ts`, add `getUserById(userId)` function (read user from `users.json` by id)
  - Add `saveUser(user)` function (write single user back to `users.json` with atomic temp+rename)
  - Add `setUserTier(userId, tier, durationDays?)` helper used by admin routes later
  - Add `bootstrapAdmin()` function called on server startup: reads `ADMIN_EMAILS` env var (comma-separated), finds matching users in `users.json`, sets their `role: 'admin'`, saves
  - Add `getAdminEmails()` helper: parses `ADMIN_EMAILS` env var into array
  - Update existing `User` initialization (e.g., in registration) to include defaults: `tier: 'free'`, `role: 'user'`, `usage: { periodStart: <first of current month>, uploads: 0, quizGenerated: 0, chatMessages: 0 }`

  **Must NOT do**:
  - Don't change the existing `users.json` structure beyond adding new fields
  - Don't add role checks to existing service functions (those go in middleware)
  - Don't call `bootstrapAdmin` from every request — only on startup

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Service helper additions following existing patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 8, 9, 13
  - **Blocked By**: Task 1 (User type must be extended first)

  **References**:
  - **Pattern References**: `backend/src/services/userService.ts` (existing user CRUD) — match style
  - **API/Type References**: `shared/types.ts` User interface (from Task 1)
  - **External References**: `backend/src/services/knowledgeGraphStorage.ts:190-233` (`saveGraph` atomic write pattern) — reuse for user save

  **WHY Each Reference Matters**:
  - `knowledgeGraphStorage.saveGraph` shows the established temp+rename atomic write pattern — reuse it
  - Existing user service has the patterns for reading from `users.json`

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] `getUserById('nonexistent')` returns `null`
  - [ ] `getUserById('valid-id')` returns the full User object
  - [ ] `saveUser(user)` persists to disk atomically (no partial writes)
  - [ ] `bootstrapAdmin()` sets role='admin' for any user with email in `ADMIN_EMAILS` env var
  - [ ] New user registration includes default `tier: 'free'`, `role: 'user'`, fresh `usage` object

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: getUserById returns null for missing user
    Tool: Bash (node REPL)
    Preconditions: users.json has 1 test user
    Steps:
      1. Call getUserById('nonexistent-id-12345')
      2. Assert result === null
    Expected Result: null
    Evidence: .sisyphus/evidence/task-4-getuserid-missing.txt

  Scenario: saveUser persists changes atomically
    Tool: Bash (node REPL)
    Preconditions: Valid user object loaded
    Steps:
      1. Load user, modify tier to 'monthly'
      2. Call saveUser(user)
      3. Read users.json directly
      4. Assert persisted tier is 'monthly'
    Expected Result: Change persisted
    Evidence: .sisyphus/evidence/task-4-saveuser-persist.txt

  Scenario: bootstrapAdmin promotes matching emails
    Tool: Bash (node REPL)
    Preconditions: ADMIN_EMAILS='admin@test.com', users.json has user with that email
    Steps:
      1. Set process.env.ADMIN_EMAILS = 'admin@test.com'
      2. Call bootstrapAdmin()
      3. Read users.json
      4. Assert that user has role='admin'
    Expected Result: Role promoted
    Evidence: .sisyphus/evidence/task-4-bootstrap-admin.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 5. Apply requireAuth + enforceQuota to upload route

  **What to do**:
  - In `backend/src/routes/upload.ts`, add imports for `requireAuth` and `enforceQuota`
  - Apply `requireAuth` then `enforceQuota('uploads')` to the POST upload handler
  - Update the upload route to handle the 429 response gracefully (it will, since `errorHandler` middleware already handles thrown AppErrors and JSON responses)
  - Test that the existing happy path still works (valid upload returns expected response)

  **Must NOT do**:
  - Don't remove existing route logic — just add middleware
  - Don't add upload-specific error handling — let the 429 pass through

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two-line middleware addition per route
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 10)
  - **Blocks**: None (frontend tasks don't directly depend on this; they depend on /api/user/quota)
  - **Blocked By**: Tasks 2, 3 (auth + quota middleware must exist)

  **References**:
  - **Pattern References**: `backend/src/routes/upload.ts` (existing route) — match style
  - **API/Type References**: Existing `uploadLimiter` in `backend/src/middleware/rateLimit.ts:40-47` — note that BOTH `uploadLimiter` (per-hour) and `enforceQuota('uploads')` (per-month) will be applied

  **WHY Each Reference Matters**:
  - `uploadLimiter` already protects this route at 30/hr. Adding `enforceQuota('uploads')` layers monthly limit on top. Both must pass.

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] Unauthenticated upload → 401 AUTH_REQUIRED
  - [ ] Authenticated upload from fresh free user → 200 (or appropriate success)
  - [ ] 3rd upload from free user → 429 QUOTA_EXCEEDED

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Upload without auth returns 401
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. curl -X POST http://localhost:3001/api/upload -F "file=@test.txt"
      2. Assert status === 401
      3. Assert body.error === 'AUTH_REQUIRED'
    Expected Result: 401 with AUTH_REQUIRED
    Evidence: .sisyphus/evidence/task-5-upload-noauth.txt

  Scenario: Free user 3rd upload returns 429
    Tool: Bash (curl)
    Preconditions: Free user with usage.uploads=2
    Steps:
      1. POST /api/upload with valid JWT
      2. Assert status === 429
      3. Assert body.quota.used === 2, body.quota.limit === 2
    Expected Result: 429 QUOTA_EXCEEDED
    Evidence: .sisyphus/evidence/task-5-upload-cap.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 6. Apply requireAuth + enforceQuota to quiz routes

  **What to do**:
  - In `backend/src/routes/quiz.ts`, add imports for `requireAuth` and `enforceQuota`
  - Apply `requireAuth` then `enforceQuota('quizGenerated')` to:
    - `POST /api/quiz/generate/:jobId` (line ~31)
    - `POST /api/quiz/topic/:topicId` (line ~66)
    - `GET /api/quiz/adaptive` (line ~98)
  - Do NOT apply to:
    - `GET /api/quiz/session/:sessionId` (read-only, free)
    - `POST /api/quiz/submit` (answer submission, free)
    - `GET /api/quiz/stats` (stats read, free)

  **Must NOT do**:
  - Don't count quiz submission as generation
  - Don't count quiz session retrieval as generation

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical middleware application
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3

  **References**:
  - **Pattern References**: `backend/src/routes/quiz.ts:31-145` — three generation routes
  - **API/Type References**: Existing `aiLimiter` already on line 31 (generate) — both will apply

  **WHY Each Reference Matters**:
  - Quiz generation routes are at lines 31, 66, 98. Submission (189) and retrieval (151, 258) are read-only and must NOT be gated.

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] Quiz submit (POST /api/quiz/submit) does NOT decrement quota
  - [ ] Quiz generate (POST /api/quiz/generate/:jobId) at cap returns 429
  - [ ] Quiz topic generate (POST /api/quiz/topic/:topicId) at cap returns 429
  - [ ] Quiz adaptive (GET /api/quiz/adaptive) at cap returns 429

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Quiz generate at free tier cap (3/mo)
    Tool: Bash (curl)
    Preconditions: Free user with usage.quizGenerated=3
    Steps:
      1. POST /api/quiz/generate/test-job-id with valid JWT
      2. Assert status === 429
      3. Assert body.quota.resource === 'quizGenerated'
    Expected Result: 429 with quizGenerated quota
    Evidence: .sisyphus/evidence/task-6-quiz-gen-cap.txt

  Scenario: Quiz submit does NOT consume quota
    Tool: Bash (curl)
    Preconditions: Free user with usage.quizGenerated=0
    Steps:
      1. POST /api/quiz/submit with valid answers and sessionId
      2. Read user JSON, assert usage.quizGenerated === 0 (unchanged)
    Expected Result: Submit doesn't count
    Evidence: .sisyphus/evidence/task-6-quiz-submit-free.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 7. Apply requireAuth + enforceQuota to chat routes

  **What to do**:
  - In `backend/src/routes/chat.ts`, add imports for `requireAuth` and `enforceQuota`
  - Apply `requireAuth` then `enforceQuota('chatMessages')` to:
    - `POST /api/chat` (line ~99)
    - `POST /api/chat/stream` (line ~185)
  - Do NOT apply to:
    - `GET /api/chat/*` (history retrieval, free)
    - Chat session listing endpoints

  **Must NOT do**:
  - Don't count history retrieval as a message
  - Don't count streaming on a partial message that errors

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical middleware application
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3

  **References**:
  - **Pattern References**: `backend/src/routes/chat.ts:99-273` — message and stream routes
  - **API/Type References**: Existing `aiLimiter` already applied — both will apply

  **WHY Each Reference Matters**:
  - Both `POST /api/chat` and `POST /api/chat/stream` send messages; both should count
  - GET routes are read-only history

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] Chat message at free tier cap (20/mo) returns 429
  - [ ] Chat stream at free tier cap returns 429
  - [ ] Chat history GET does NOT consume quota

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Chat message at cap returns 429
    Tool: Bash (curl)
    Preconditions: Free user with usage.chatMessages=20
    Steps:
      1. POST /api/chat with valid JWT and body { message: "test" }
      2. Assert status === 429
      3. Assert body.quota.resource === 'chatMessages'
    Expected Result: 429 with chatMessages quota
    Evidence: .sisyphus/evidence/task-7-chat-cap.txt

  Scenario: Chat history GET doesn't consume quota
    Tool: Bash (curl)
    Preconditions: Free user with usage.chatMessages=0
    Steps:
      1. GET /api/chat/sessions with valid JWT (or whatever history endpoint)
      2. Read user JSON, assert usage.chatMessages === 0
    Expected Result: History read doesn't count
    Evidence: .sisyphus/evidence/task-7-chat-history-free.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 8. /api/user/quota read-only endpoint

  **What to do**:
  - In `backend/src/routes/userSettings.ts` (or wherever `me` endpoint lives), add `GET /api/user/quota` endpoint
  - Requires auth (use `requireAuth`)
  - Returns: `{ tier, role, usage: { periodStart, uploads, quizGenerated, chatMessages }, limits: { uploads, quizGenerated, chatMessages }, subscriptionStartedAt, subscriptionExpiresAt, resetsAt }`
  - Does NOT increment any counter (read-only)
  - Also handles lazy period check — if user is in new period, return reset values (don't persist)

  **Must NOT do**:
  - Don't increment any counter
  - Don't require admin role — this is for the user to see their own quota
  - Don't return other users' data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple read endpoint
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 9, 10)
  - **Blocks**: Task 11 (UsageWidget fetches from this endpoint)
  - **Blocked By**: Tasks 1, 2, 4

  **References**:
  - **Pattern References**: `backend/src/routes/userSettings.ts` (existing user settings route) — match style
  - **API/Type References**: `TIER_LIMITS` from Task 1, User from `shared/types.ts`

  **WHY Each Reference Matters**:
  - Existing user settings route shows the pattern for authenticated user-scoped endpoints

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] Authenticated request returns full quota info
  - [ ] Unauthenticated request returns 401
  - [ ] Returned `usage` reflects current state (post-rollover if applicable)
  - [ ] `resetsAt` is the correct next anniversary date for the user's tier

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: /api/user/quota returns current usage
    Tool: Bash (curl)
    Preconditions: Free user with usage.uploads=1, usage.quizGenerated=0, usage.chatMessages=5
    Steps:
      1. GET /api/user/quota with valid JWT
      2. Assert status === 200
      3. Assert body.usage.uploads === 1
      4. Assert body.limits.uploads === 2 (free tier)
      5. Assert body.tier === 'free'
    Expected Result: Quota info returned
    Evidence: .sisyphus/evidence/task-8-quota-get.txt

  Scenario: /api/user/quota without auth returns 401
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. GET /api/user/quota (no auth header)
      2. Assert status === 401
    Expected Result: 401
    Evidence: .sisyphus/evidence/task-8-quota-noauth.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 9. Admin routes (5 endpoints)

  **What to do**:
  - Create `backend/src/routes/admin.ts` with 5 routes, all gated by `requireAdmin`:
    1. `GET /api/admin/users` — list all users with `{ id, email, username, tier, role, usage, subscriptionStartedAt, subscriptionExpiresAt }` (omit password)
    2. `GET /api/admin/users/:userId` — single user details (omit password)
    3. `PATCH /api/admin/users/:userId/tier` — body `{ tier, durationDays? }`, sets tier, computes `subscriptionStartedAt = now`, `subscriptionExpiresAt = now + durationDays` (default 30 for monthly, 365 for yearly)
    4. `PATCH /api/admin/users/:userId/role` — body `{ role: 'user' | 'admin' }`, sets role
    5. `GET /api/admin/stats` — aggregate: total users, free/paid counts, total MRR estimate (paid × price), total uploads this month across all users
  - Mount in `backend/src/routes/index.ts` via `router.use('/api/admin', adminRouter)`
  - Use `asyncHandler` wrapper for all routes
  - Validate request bodies (e.g., tier must be one of the valid values)

  **Must NOT do**:
  - Don't return password fields (even hashed) in any response
  - Don't allow admin to delete users (out of scope)
  - Don't allow non-admin to call these (requireAdmin handles this)
  - Don't skip input validation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 5 endpoints with input validation, auth, and aggregation logic
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `security-express`: Could audit, but standard admin route pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8, 10)
  - **Blocks**: Task 13 (admin page)
  - **Blocked By**: Tasks 2, 4 (admin middleware + user service helpers)

  **References**:
  - **Pattern References**: `backend/src/routes/quiz.ts:14-15` (existing router pattern with `authenticate` and `asyncHandler`) — match style
  - **API/Type References**: `TIER_LIMITS` from Task 1, `setUserTier` from Task 4

  **WHY Each Reference Matters**:
  - Existing route files show the patterns for `asyncHandler`, `authenticate`, and error throwing
  - `setUserTier` from Task 4 is the helper for PATCH /tier endpoint

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] All 5 routes return 403 for non-admin users
  - [ ] `GET /api/admin/users` returns list with passwords omitted
  - [ ] `PATCH /api/admin/users/:userId/tier` with valid body updates user and returns updated user
  - [ ] Invalid tier in PATCH body returns 400
  - [ ] `GET /api/admin/stats` returns aggregate counts

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Non-admin gets 403 on admin route
    Tool: Bash (curl)
    Preconditions: Valid JWT for non-admin user
    Steps:
      1. GET /api/admin/users with non-admin JWT
      2. Assert status === 403
    Expected Result: 403 Forbidden
    Evidence: .sisyphus/evidence/task-9-admin-403.txt

  Scenario: Admin can list users without passwords
    Tool: Bash (curl)
    Preconditions: Valid admin JWT, users.json has 2+ test users
    Steps:
      1. GET /api/admin/users with admin JWT
      2. Assert status === 200
      3. Assert response body.users array has no 'password' or 'passwordHash' field
    Expected Result: User list returned, no password leakage
    Evidence: .sisyphus/evidence/task-9-admin-list.txt

  Scenario: Admin can upgrade user tier
    Tool: Bash (curl)
    Preconditions: Admin JWT, free test user exists
    Steps:
      1. PATCH /api/admin/users/<test-id>/tier with body { tier: 'monthly', durationDays: 30 }
      2. Assert status === 200
      3. Read users.json, assert user.tier === 'monthly', subscriptionExpiresAt is set
    Expected Result: User upgraded
    Evidence: .sisyphus/evidence/task-9-admin-upgrade.txt

  Scenario: Invalid tier returns 400
    Tool: Bash (curl)
    Preconditions: Admin JWT
    Steps:
      1. PATCH /api/admin/users/<test-id>/tier with body { tier: 'invalid_tier' }
      2. Assert status === 400
    Expected Result: 400 Bad Request
    Evidence: .sisyphus/evidence/task-9-admin-invalid.txt

  Scenario: Admin stats aggregates correctly
    Tool: Bash (curl)
    Preconditions: Admin JWT, mix of free and paid users in users.json
    Steps:
      1. GET /api/admin/stats
      2. Assert body has totalUsers, freeCount, paidCount, estimatedMRR
    Expected Result: Stats returned
    Evidence: .sisyphus/evidence/task-9-admin-stats.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 10. SM-2 review init fix in jobProcessor

  **What to do**:
  - In `backend/src/services/jobProcessor.ts`, import `initializeReview` from `./reviewService`
  - After `userProgressService.markNodesAsKnownWithMastery(...)` calls (lines ~300 MULTIPLE, ~350 SINGLE), loop through `matchedNodeIds` and call `await initializeReview(nodeId, context.job.userId ?? '')` for each
  - Wrap each `initializeReview` in try/catch (don't fail the whole job if one fails)
  - This populates the review queue so uploads actually drive SM-2 spaced repetition

  **Must NOT do**:
  - Don't fail the upload pipeline if review init fails — wrap in try/catch
  - Don't double-initialize reviews (the function checks for existing entry already)
  - Don't remove the existing `markNodesAsKnownWithMastery` call

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, targeted fix with clear pattern
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8, 9)
  - **Blocks**: None (frontend doesn't depend on this; it's a backend UX fix)
  - **Blocked By**: None (uses existing reviewService function)

  **References**:
  - **Pattern References**: `backend/src/services/reviewService.ts:82-95` (`initializeReview` function) — already exists, just needs to be called
  - **API/Type References**: `backend/src/services/jobProcessor.ts:300, 350` (existing `markNodesAsKnownWithMastery` calls) — add right after these

  **WHY Each Reference Matters**:
  - `initializeReview` already exists and handles the "don't double-add" case internally
  - Existing call sites in jobProcessor show where to add the new call

  **Acceptance Criteria**:

  - [ ] `cd backend && npx tsc --noEmit` → PASS
  - [ ] After successful upload, `data/reviews-{userId}.json` contains entries for the uploaded node IDs
  - [ ] `GET /api/reviews/due` returns those nodes for the user
  - [ ] Existing upload flow still works (no regressions)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Upload populates review queue
    Tool: Bash (curl + filesystem check)
    Preconditions: Test user, fresh uploads, upload a test document
    Steps:
      1. POST /api/upload with valid JWT
      2. Wait for job to complete
      3. Read data/reviews-{userId}.json
      4. Assert it has at least one entry with the matched node ID
      5. GET /api/reviews/due with same JWT
      6. Assert response has at least 1 due review
    Expected Result: Review queue populated
    Evidence: .sisyphus/evidence/task-10-review-populated.txt
  ```

  **Commit**: NO (groups with final commit)

- [x] 11. UsageWidget component

  **What to do**:
  - Create `frontend/components/dashboard/UsageWidget.tsx` as a client component
  - Fetches from `/api/user/quota` on mount
  - Displays 3 progress bars (uploads, quiz, chat) with current/limit
  - Color-coded: green if < 50% used, amber 50-80%, red > 80%
  - Shows current tier badge (免费/月卡/年卡)
  - Shows resetsAt as relative time ("12天后重置" / "Resets in 12 days")
  - "升级套餐" button when at or near cap (routes to /pricing or wherever)
  - Dark mode support per `frontend/AGENTS.md` rules (check `useTheme().theme`)
  - Use Tailwind v4 per existing frontend patterns, shadcn/ui (base-nova) style
  - Loading state: skeleton bars
  - Error state: silent retry once, then show generic message

  **Must NOT do**:
  - Don't hardcode colors — use theme tokens
  - Don't add `bg-gray-*` — use `bg-slate-*`
  - Don't add a real-time counter (just fetch on mount + manual refresh)
  - Don't add tier upgrade flow inside the widget (just link out)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual component with dark mode + progress bars
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `component-engineering`: Could apply, but the component is presentation-only, no keyboard map needed
    - `impeccable`: Could apply for design polish, but the widget is functional not aesthetic-hero
    - `shadcn-template-style`: Style is project-standard, not template-specific

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 14)
  - **Blocks**: Task 12 (dashboard integration)
  - **Blocked By**: Task 8 (the /api/user/quota endpoint)

  **References**:
  - **Pattern References**: `frontend/components/dashboard/` (existing dashboard components) — match style
  - **API/Type References**: `frontend/lib/api.ts` (fetch + Bearer auth pattern)
  - **Test References**: N/A (no test infrastructure)
  - **External References**: `frontend/AGENTS.md` for theme tokens and dark mode rules

  **WHY Each Reference Matters**:
  - Existing dashboard components show the established visual style and dark-mode pattern
  - `lib/api.ts` has the canonical fetch wrapper that handles auth
  - `AGENTS.md` has hard rules on colors and dark mode

  **Acceptance Criteria**:

  - [ ] `cd frontend && npm run lint` → PASS
  - [ ] `cd frontend && npx tsc --noEmit` → PASS
  - [ ] Component renders on dashboard
  - [ ] Progress bars reflect current usage
  - [ ] Dark mode renders correctly (no `bg-white` leakage)
  - [ ] "升级套餐" button visible when at/near cap

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: UsageWidget displays current usage
    Tool: Playwright (or dev-browser)
    Preconditions: Logged-in test user with some usage
    Steps:
      1. Navigate to /dashboard
      2. Wait for UsageWidget to load
      3. Assert 3 progress bars visible
      4. Assert tier badge shows correct tier
      5. Screenshot for evidence
    Expected Result: Widget displays correctly
    Evidence: .sisyphus/evidence/task-11-widget-display.png

  Scenario: UsageWidget shows "upgrade" CTA at cap
    Tool: Playwright
    Preconditions: Free user at upload cap
    Steps:
      1. Navigate to /dashboard
      2. Assert "升级套餐" button is visible
      3. Screenshot
    Expected Result: Upgrade CTA visible
    Evidence: .sisyphus/evidence/task-11-widget-upgrade-cta.png

  Scenario: UsageWidget renders in dark mode
    Tool: Playwright
    Preconditions: Dark mode enabled
    Steps:
      1. Toggle dark mode
      2. Navigate to /dashboard
      3. Assert no `bg-white` color visible (check via computed style)
      4. Screenshot
    Expected Result: Dark mode renders correctly
    Evidence: .sisyphus/evidence/task-11-widget-dark.png
  ```

  **Commit**: NO (groups with final commit)

- [x] 12. Dashboard integration

  **What to do**:
  - In `frontend/app/(protected)/dashboard/page.tsx`, import and mount `<UsageWidget />`
  - Place it in a logical location (top of dashboard, near stats cards)
  - Wrap in the same container styling as other dashboard widgets

  **Must NOT do**:
  - Don't refactor the existing dashboard structure
  - Don't add multiple instances of the widget

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: One-line component mount
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13, 14)
  - **Blocks**: None
  - **Blocked By**: Task 11 (component must exist)

  **References**:
  - **Pattern References**: `frontend/app/(protected)/dashboard/page.tsx` (existing dashboard layout) — match import + mount pattern

  **WHY Each Reference Matters**:
  - Existing dashboard shows where to import and how to mount the widget

  **Acceptance Criteria**:

  - [ ] `cd frontend && npx tsc --noEmit` → PASS
  - [ ] Dashboard renders without errors
  - [ ] UsageWidget visible on dashboard

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Widget visible on dashboard
    Tool: Playwright
    Preconditions: Logged-in user
    Steps:
      1. Navigate to /dashboard
      2. Assert UsageWidget element is in DOM
      3. Screenshot
    Expected Result: Widget visible
    Evidence: .sisyphus/evidence/task-12-dashboard-widget.png
  ```

  **Commit**: NO (groups with final commit)

- [x] 13. Admin page (table view)

  **What to do**:
  - Create `frontend/app/(protected)/admin/page.tsx`
  - Fetches `/api/admin/users` (admin only)
  - Renders table with columns: Email, Username, Tier, Role, Uploads, Quiz, Chat, Subscription Expires
  - Per-row action: "Edit tier" button opens a modal with tier select + duration input, calls PATCH `/api/admin/users/:userId/tier`
  - Per-row action: "Toggle admin" button calls PATCH `/api/admin/users/:userId/role`
  - Display `/api/admin/stats` summary at top (total users, free/paid split, est. MRR)
  - Handle 403 gracefully: show "无权限" message and link back to dashboard
  - Dark mode support
  - Use Tailwind v4 + shadcn/ui

  **Must NOT do**:
  - Don't show password fields (backend already omits)
  - Don't add user creation/deletion in this page
  - Don't add bulk operations
  - Don't add a "danger zone" for permanent actions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Table view with modals and admin actions
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 14)
  - **Blocks**: None
  - **Blocked By**: Task 9 (admin routes)

  **References**:
  - **Pattern References**: `frontend/app/(protected)/` (protected page patterns), existing list/table components in `frontend/components/`
  - **API/Type References**: `frontend/lib/api.ts`, `/api/admin/*` endpoints from Task 9
  - **External References**: `frontend/AGENTS.md` theme rules

  **WHY Each Reference Matters**:
  - Protected route group shows the auth gate pattern
  - Existing components show table styling patterns
  - lib/api.ts has the auth wrapper

  **Acceptance Criteria**:

  - [ ] `cd frontend && npm run lint` → PASS
  - [ ] `cd frontend && npx tsc --noEmit` → PASS
  - [ ] Admin can see all users in table
  - [ ] Non-admin sees 403 message
  - [ ] Tier edit modal works (PATCH succeeds, table refreshes)
  - [ ] Role toggle works

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Admin sees user table
    Tool: Playwright
    Preconditions: Logged-in admin user
    Steps:
      1. Navigate to /admin
      2. Assert table is visible with user rows
      3. Assert stats summary visible
      4. Screenshot
    Expected Result: Admin panel renders
    Evidence: .sisyphus/evidence/task-13-admin-table.png

  Scenario: Non-admin sees 403 message
    Tool: Playwright
    Preconditions: Logged-in non-admin user
    Steps:
      1. Navigate to /admin
      2. Assert "无权限" or similar message visible
      3. Screenshot
    Expected Result: 403 message shown
    Evidence: .sisyphus/evidence/task-13-admin-403.png

  Scenario: Tier edit modal works
    Tool: Playwright
    Preconditions: Admin user, test user exists
    Steps:
      1. Navigate to /admin
      2. Click "Edit tier" on test user row
      3. Select "monthly" + duration 30
      4. Click submit
      5. Assert table refreshes, test user shows tier=monthly
      6. Screenshot
    Expected Result: Tier updated, table refreshed
    Evidence: .sisyphus/evidence/task-13-admin-tier-edit.png
  ```

  **Commit**: NO (groups with final commit)

- [x] 14. lib/api.ts 429 handling with upgrade CTA

  **What to do**:
  - In `frontend/lib/api.ts` (or wherever the global fetch wrapper lives), catch 429 responses with `error: 'QUOTA_EXCEEDED'`
  - Show a toast notification with Chinese message and "升级套餐" link to `/pricing` (or wherever pricing lives)
  - If 401 `AUTH_REQUIRED`, redirect to `/auth/login` (existing behavior may handle this)
  - Don't crash on 429 — surface as friendly error

  **Must NOT do**:
  - Don't auto-redirect to login on 429 (it's a quota issue, not auth)
  - Don't show a generic error toast — show quota-specific message

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small fetch interceptor addition
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 13)
  - **Blocks**: None
  - **Blocked By**: None (can be done independently; will be tested once backend returns 429s)

  **References**:
  - **Pattern References**: `frontend/lib/api.ts` (existing fetch + auth handling) — match style
  - **API/Type References**: `axios` interceptors in `frontend/lib/auth.ts` (per AGENTS.md note about axios) — check if used

  **WHY Each Reference Matters**:
  - Existing `lib/api.ts` and `lib/auth.ts` show the established patterns for fetch/axios response handling
  - 401 redirect to login may already be implemented; just verify the 429 path

  **Acceptance Criteria**:

  - [ ] `cd frontend && npx tsc --noEmit` → PASS
  - [ ] 429 response with `QUOTA_EXCEEDED` shows Chinese toast
  - [ ] 401 response still redirects to login (existing behavior preserved)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: 429 quota-exceeded shows upgrade toast
    Tool: Playwright
    Preconditions: Free user at upload cap, logged in
    Steps:
      1. Attempt to upload a document
      2. Assert toast appears with "升级套餐" link
      3. Screenshot
    Expected Result: Upgrade toast shown
    Evidence: .sisyphus/evidence/task-14-429-toast.png
  ```

  **Commit**: NO (groups with final commit)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

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

- [x] F3. (manual QA via running servers; subagent retry avoided) **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (admin upgrade → next request uses new tier). Test edge cases: tier expiry mid-month, month rollover, two simultaneous uploads, failed OCR after quota increment. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

Single commit at end after user approval of F1-F4. Do NOT commit during execution.

- **Final commit**: `feat(tiers): add tier-based quota enforcement and admin tools`
  - Files: all changed files in `backend/src/config/tiers.ts` (new), `backend/src/middleware/quota.ts` (new), `backend/src/middleware/auth.ts`, `backend/src/routes/admin.ts` (new), `backend/src/routes/upload.ts`, `backend/src/routes/quiz.ts`, `backend/src/routes/chat.ts`, `backend/src/routes/userSettings.ts`, `backend/src/routes/index.ts`, `backend/src/services/jobProcessor.ts`, `backend/src/services/userService.ts`, `shared/types.ts`, `frontend/components/dashboard/UsageWidget.tsx` (new), `frontend/app/(protected)/admin/page.tsx` (new), `frontend/app/(protected)/dashboard/page.tsx`, `frontend/lib/api.ts`
  - Pre-commit: `cd backend && npx tsc --noEmit && cd ../frontend && npm run lint`

---

## Success Criteria

### Verification Commands
```bash
# Type checks
cd C:\Users\64887\ocr-kb-matcher\backend && npx tsc --noEmit
cd C:\Users\64887\ocr-kb-matcher\frontend && npx tsc --noEmit

# Lint
cd C:\Users\64887\ocr-kb-matcher\frontend && npm run lint

# Health check (server should still boot)
curl http://localhost:3001/health

# Backend smoke tests (require server running)
# 1. Register a test user
# 2. Login to get token
# 3. Hit upload route 3 times as free user → 3rd should be 429
# 4. Admin promote to monthly → 4th upload should succeed
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All F1-F4 reviews APPROVE
- [ ] TypeScript compiles cleanly (backend + frontend)
- [ ] Frontend lint passes
- [ ] Backend health check returns 200
- [ ] User explicitly approved final results

---

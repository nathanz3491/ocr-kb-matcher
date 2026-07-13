# Wave 1 Learnings — Tier Scaffolding

## Critical Architectural Decisions

1. **Type alignment**: `Tier`, `UserRole`, `Usage` are defined ONLY in `shared/types.ts` (canonical source). `backend/src/types/auth.ts` imports them. NEVER re-define these locally — create one import path only.

2. **Field naming canonical**:
   - `subscriptionStartedAt` (when paid tier began)
   - `subscriptionExpiresAt` (when paid tier auto-reverts to free)
   - `tier: Tier` (current tier)
   - `role: 'user' | 'admin'`
   - `usage: { periodStart, uploads, quizGenerated, chatMessages }`
   - **DO NOT use `tierExpiresAt`** (legacy name from earlier draft — superseded)

3. **Field optionality**: ALL of `tier`, `subscriptionStartedAt`, `subscriptionExpiresAt`, `role`, `usage` are OPTIONAL (`?:`) on the User interface. Reason: existing `users.json` entries do not have these fields. `createUser` in `userService.ts` sets defaults. Always use `user.tier ?? 'free'`, `user.role ?? 'user'`, `user.usage ?? { ... default usage ... }`.

4. **Tiers are exactly 3**: `'free' | 'monthly' | 'yearly'`. NO `'lifetime'` (was scope creep from earlier subagent — rejected). Don't add new tiers without plan update.

## Auth Middleware Patterns

1. **`requireAuth` and `requireAdmin` already in `backend/src/middleware/auth.ts`**. Imports: `requireAuth`, `requireAdmin` from `'../middleware/auth'`.

2. **NO console.log in middleware**: A previous subagent added `console.log(token)` debug statements that leaked auth tokens. Caught and removed. Always verify with `grep -r "console\.log" backend/src/middleware/` before declaring done.

3. **`optionalAuth` MUST stay unchanged**: It's used for read-only routes (graph browse, materials view, etc.). Adding role checks or behavior changes breaks guest access patterns.

## User Service Patterns

1. **`getUserById(id): Promise<User | null>`** returns `null` (not `undefined`) for nonexistent users. Use `if (!user)` checks (treats both as falsy consistently).

2. **`saveUser(user): Promise<void>`** writes atomically (temp+rename pattern from `knowledgeGraphStorage.saveGraph`). Updates the user in cache then syncs entire cache to disk.

3. **`setUserTier(userId, tier, durationDays?)`** updates tier + optional expiration. Returns the updated user or null if not found.

4. **`bootstrapAdmin()` reads `ADMIN_EMAILS` env var** (comma-separated), finds matching users, sets `role: 'admin'`. Should be called on server startup only (not per-request). Not yet wired into `index.ts` — Wave 2/3 task should add this if needed.

5. **`createUser` defaults**: `tier: 'free'`, `role: 'user'`, `usage: { periodStart: getCurrentMonthStart(), uploads: 0, quizGenerated: 0, chatMessages: 0 }`. The auth route `routes/auth.ts` calls `createUser` and these defaults are set inside the function.

## Tier Config Patterns

1. **`backend/src/config/tiers.ts`** is the single source of truth. Pure module — no Express. Exports:
   - `TIER_LIMITS: Record<Tier, {uploads, quizGenerated, chatMessages}>`
   - `getCurrentMonthStart(): string` — ISO date for 1st of current UTC month
   - `isCurrentPeriod(user, now): boolean` — checks if now falls within [periodStart, periodStart + period)
   - `nextAnniversaryDate(subscriptionStartedAt, tier, now): string` — when next period begins

2. **Period semantics** (consistent for all consumers):
   - **free**: period = current calendar month (periodStart = 1st)
   - **monthly**: period = periodStart + 1 month
   - **yearly**: period = periodStart + 1 year

3. **UTC-only date math**: All `Date.UTC`, `setUTCMonth`, `setUTCFullYear`. Never local-time setters — timezone bugs will cascade.

## Things to Avoid (rejected patterns)

- **Don't redefine Tier/UserRole/Usage locally** — caused type inconsistency between `shared/types.ts` and `backend/src/types/auth.ts`. Fixed but track.
- **Don't use `tierExpiresAt`** — use `subscriptionExpiresAt`.
- **Don't add `console.log` in middleware** — security and noise.
- **Don't refund quota on operation failure** — matches existing rate-limit pattern. If user uploads and OCR fails, they still consume 1 quota slot.
- **Don't add file-locking for race conditions** — accept the small risk, document it.
- **Don't add background services / cron jobs** — lazy evaluation handles all the rollover cases without scheduled tasks.
- **Don't modify `routes/types.ts`** — known stale duplicate per AGENTS.md.
- **Don't touch 3 model constants**: model stays `moonshot-v1-8k`, no model upgrade in this plan.

## Build Quirks

- `backend/tsconfig.json` excludes `src/_qa_*` — left over from QA artifacts. Don't remove this exclusion or Task 1's broken `_qa_task1.ts` (with bad import path) will block tsc compile.
- Frontend `next.config.ts` has `typescript.ignoreBuildErrors: true` — don't trust `next build` to catch TS errors. Run `cd frontend && npx tsc --noEmit` manually.

## Task 8 — `/api/user/quota` Endpoint

1. **Route location**: `GET /api/user/quota` is defined in `backend/src/routes/userSettings.ts` as `router.get('/quota', ...)`. Mounted at `/api/user` by `routes/index.ts`. The `router.use(authenticate)` at the top of the file handles auth for all routes in this file.

2. **Auth is handled at the router level**: `router.use(authenticate)` applies to all routes. Individual routes also check `if (!req.user)` as a defensive measure. No need for per-route `requireAuth`.

3. **`subscriptionStartedAt` typing gap**: The local `User` type in `backend/src/types/auth.ts` does NOT include `subscriptionStartedAt`, but the shared `User` type in `shared/types.ts` does. To access this field at runtime, use `(user as { subscriptionStartedAt?: string }).subscriptionStartedAt` — a narrow type assertion that doesn't use `as any`.

4. **Lazy period rollover persisted**: Following the `enforceQuota` middleware pattern from `middleware/quota.ts`, the read-only quota endpoint persists period rollovers with `saveUser(user)` so subsequent calls see clean state. This ensures consistency between `enforceQuota` (which also persists) and the read endpoint.

5. **`resetsAt` computation**:
   - Free tier: `nextAnniversaryDate(usage.periodStart, 'free', now)` → always returns 1st of next UTC month
   - Paid tiers: `nextAnniversaryDate(subscriptionStartedAt ?? usage.periodStart, tier, now)` — falls back to `usage.periodStart` if `subscriptionStartedAt` is undefined

6. **QA evidence**: Both scenarios confirmed via curl against live server.

## Frontend Patterns (preview for Wave 3)

- `@/*` alias maps to `./frontend/*`
- `@shared/*` alias maps to `../shared/*` (configured in both tsconfigs)
- Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.*`)
- shadcn/ui style is `base-nova` per `components.json`
- Icons: Lucide React — individual imports only, never barrel
- Dark mode: every component checks `useTheme().theme` ('light' | 'dark')
- Never use `bg-white`, `bg-gray-*`, hardcoded colors — use `bg-slate-*`, theme tokens
- Always use `clsx()` or `cn()` for conditional classes

## Wave 2 — Task 6 Learnings (Quiz Route Quota)

1. **Quiz routes pattern**: `authenticate` applied at router level (line 17), which sets `req.user`. The 3 generation routes need explicit `requireAuth, enforceQuota('quizGenerated')` middleware added to their handler chain. The `authenticate` on line 17 already runs but `enforceQuota` bundles its own `requireAuth` internally.

2. **Existing middleware on routes**:
   - `POST /generate/:jobId` — already had `aiLimiter` (per-hour rate limit), added `requireAuth, enforceQuota('quizGenerated')` after it
   - `POST /topic/:topicId` — had no route-level middlewares, added `requireAuth, enforceQuota('quizGenerated')`
   - `GET /adaptive` — already had `authenticate, asyncHandler`, added `requireAuth, enforceQuota('quizGenerated')` between them

3. **Read-only routes intentionally exempt**:
   - `GET /session/:sessionId` — no quota
   - `POST /submit` — no quota (answer submission, not generation)
   - `GET /stats` — no quota

4. **QA confirmed**:
   - Free user at `quizGenerated=3` gets 429 `QUOTA_EXCEEDED` on all 3 generation routes
   - Submit route returns handler error (500) not quota error (429) — confirmed no quota middleware
   - Stats and session routes work without quota enforcement
   - `usage.quizGenerated` does NOT increment on submit calls


## Task 11 �� UsageWidget Component (Frontend)

1. **Component location**: rontend/components/dashboard/UsageWidget.tsx �� follows the dashboard component grouping pattern.
2. **Design system compliance**: Uses GlassCard-style container (ounded-2xl border backdrop-blur-xl p-6 shadow-2xl with theme-aware bg/border), useTheme() for dark mode, clsx for all conditional classes, individual Lucide imports.
3. **API integration**: Uses pi.get('/api/user/quota') from @/lib/api.ts which auto-injects Bearer auth. Response shape matches Task 8 endpoint exactly.
4. **Progress bar color logic**: < 0.5 �� emerald-500,  .5�C0.8 �� amber-500, > 0.8 �� red-500. Same colors in light/dark (the bar colors are vivid enough to work in both).
5. **Tier badge colors**: ���=slate, �¿�=blue, �꿨=purple �� consistent with shadcn-nova semantic color conventions.
6. **Skeleton state**: Custom inline skeleton bars using nimate-pulse and theme-aware g-slate-700/50 / g-slate-200/60 �� matches existing SkeletonLoader patterns without adding new dependencies.
7. **Error handling**: Silent retry once (attempt 1 �� attempt 2 after 1s), then falls through to error message UI.
8. **Upgrade CTA**: Visible when any of the 3 usage ratios >= 0.8. Uses the primary gradient button pattern from AGENTS.md.
9. **resetsAt formatting**: Custom ormatTimeUntil() helper �� shows 'X �������' style relative future time (not 'ago' format).
10. **No console.log**: Verified no logging statements in the component.
11. **Lint/type check**: UsageWidget.tsx passes cleanly — no errors or warnings from the new file. Pre-existing errors in other files are unrelated.

## Task 14 — 429 QUOTA_EXCEEDED Toast (Frontend)

1. **Dual detection approach**: 429 handling added in BOTH `lib/api.ts` (raw fetch wrapper) and `lib/auth.ts` (axios interceptor). This covers both the fetch-based API calls and axios-based uploads.

2. **Custom event bridge**: Since toast requires React context (`useToast()`), the non-React modules dispatch a `CustomEvent('app:quota-exceeded')` on `window`. The `QuotaExceededHandler` React component listens for this event and shows the toast.

3. **Component placement**: `QuotaExceededHandler` is mounted in `layout.tsx` outside `ConfettiProvider` but inside `ToastProvider`, so it has access to `useToast()` but doesn't interfere with the main content.

4. **Toast content**: Warning-style gradient with `AlertTriangle` icon, message from backend (Chinese), and a `Link` to `/admin` labeled "升级套餐". No `/pricing` page exists; `/admin` does.

5. **No new dependencies**: Uses existing `clsx`, `lucide-react`, `next/link` — all already in the project.

6. **No regressions**: 401 redirect in `auth.ts` still works; other errors pass through unchanged. `api.ts` returns the original Response unconsumed (uses `response.clone()` to peek at body).

7. **Screenshot evidence**: Captured via Playwright headless — dispatch `CustomEvent` -> toast appears with Chinese text and upgrade link. Saved to `.sisyphus/evidence/task-14-429-toast.png`.

## Task 5 — Upload Route requireAuth + enforceQuota

1. **Middleware chain on POST `/`**: `uploadLimiter` (router-level) → `authenticate` (router-level) → `requireAuth` → `enforceQuota('uploads')` → handler.

2. **Router-level middleware already gates**: `router.use(authenticate)` (line 36) runs BEFORE the route-level `requireAuth`. This means `authenticate` returns 401 with "No authorization header provided" before `requireAuth`'s `AUTH_REQUIRED` is ever reached. `requireAuth` is still added for explicitness (consistent with Tasks 6, 7).

3. **`enforceQuota` composes `requireAuth` internally**: The middleware factory in `quota.ts` already calls `requireAuth` as a nested callback. Chaining both explicitly is redundant but consistent with the plan.

4. **No handler logic changes**: Only the middleware chain was modified — the handler body (file processing, OCR pipeline) was untouched.

5. **`uploadLimiter` unchanged**: The existing per-hour rate limiter (30/hr) remains at `router.use` level and stacks with the monthly `enforceQuota` — two different time windows enforced independently.

6. **QA verified**:
   - Unauthenticated POST → 401 (caught by `authenticate` middleware before reaching quota)
   - Authenticated free user 3rd upload → 429 QUOTA_EXCEEDED with full quota info (`{"used":2,"limit":2,"tier":"free"}`)
- Earlier sub-routes (`/single`, `/multiple`, `/text`, `/url`) do NOT have `enforceQuota` — only the main POST `/` does

## F1 Audit Findings (Plan Compliance)

### Verdict: APPROVE_WITH_NITS

### Must Have (6/6 PASS)
1. Tier enforcement: quota.ts has full 429 enforcement with lazy downgrade + rollover
2. Admin tier mgmt: admin.ts with 5 endpoints, all gated by requireAdmin
3. Frontend display: UsageWidget on dashboard with progress bars, tier badge, resetsAt countdown
4. SM-2 review populates: initializeReview called in jobProcessor.ts (2 locations, try/catch)
5. Lazy rollover: isCurrentPeriod in tiers.ts, no cron/setInterval in quota code
6. Login required: requireAuth on upload, quiz (3 gen routes), chat (2 POST routes); read endpoints exempt

### Must NOT Have (9/9 PASS)
1-4: No payment, WeChat, iOS, gaokao tier — zero matches
5: No AI slop comments — functional, short comments only
6: No as any/@ts-ignore in NEW code (3 pre-existing usages only)
7: No background rollover services — setInterval only in queueProcessor/tokenRevocation
8: routes/types.ts unchanged — git diff empty
9: Race condition documented in quota.ts header

### NITs Found (3 total, all LOW impact)
1. bootstrapAdmin() NOT wired to index.ts startup — exists but never called. Admin still works via ADMIN_EMAILS env var fallback in requireAdmin middleware.
2. admin.ts:34 — `(user as unknown as Record<string, unknown>)` borderline type assertion (not as any but functionally equivalent)
3. JWT payload lacks role field — requireAdmin role check path unreachable; relies solely on ADMIN_EMAILS fallback

## Task 6 — Basic CI Pipeline (GitHub Actions)

1. **File created**: `.github/workflows/ci.yml` with 28 lines.
2. **Trigger**: `on: [push, pull_request]` — every push and every PR.
3. **Steps**: checkout → setup-node (20.x) → npm ci → backend tsc --noEmit → frontend npm ci → frontend lint → frontend tsc --noEmit.
4. **Pre-existing issues surfaced**:
   - Backend tsc: 1 error (backend/src/lib/logger.ts:49, pino-http type mismatch)
   - Frontend lint: 74 errors, 124 warnings (across many components)
   - Frontend tsc: 7 type errors (graph-editor props, missing module)
5. **CI is correctly configured** to fail on these pre-existing issues — they are out of scope for this task.
6. **Evidence**: `.sisyphus/evidence/task-6-ci-runs.txt`
7. **Commit**: 9b7f54a with message `ci: basic typecheck + lint pipeline`

## Task 12 — Dashboard Integration (UsageWidget)

1. **Mount location**: `<UsageWidget />` placed between the Progress Bar and Quick Links Grid sections in `frontend/app/(protected)/dashboard/page.tsx` — logical flow: stats → progress → usage → quick links.
2. **Import**: Named export `{ UsageWidget }` from `@/components/dashboard/UsageWidget` — NOT a default export.
3. **No refactoring**: Minimal change — only added the import (line 13) and the JSX tag (between Progress Bar and Quick Links Grid). No other modifications to the dashboard file.
4. **Styling match**: UsageWidget uses the same glass card pattern (`rounded-2xl border backdrop-blur-xl p-6 shadow-2xl`) as all dashboard widgets — fits visually without any container wrapper.
5. **Auth caveat for Playwright screenshots**: The dashboard under `(protected)/` requires authentication. The `axios.interceptors.response` handler in `lib/auth.ts` redirects to `/auth/login` on ANY 401 backend response. To capture the screenshot, API calls to the backend must be intercepted and mocked (Playwright `page.route('**/api/**', ...)`). The `addInitScript` approach alone is insufficient — the axios 401 interceptor triggers the redirect.
6. **Evidence**: `task-12-dashboard-widget.png` shows UsageWidget with 免费 tier badge, 3 progress bars (文档上传 3/10, 测验生成 5/20, AI 对话 10/50), and resetsAt countdown.



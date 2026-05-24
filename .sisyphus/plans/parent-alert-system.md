# Parent Alert System

## TL;DR

> **Quick Summary**: Build a backend alert engine that monitors 4 "not on task" signals per student, sends batched daily digest emails to parents via Brevo SMTP, shows real-time in-app alert badges/banners in the parent monitor dashboard, and auto-resolves alerts when students correct the behavior.
>
> **Deliverables**:
> - `backend/src/services/parentAlertService.ts` — alert data model + storage + signal computation
> - `backend/src/services/parentNotificationService.ts` — Brevo email sending (real-time + daily digest)
> - `backend/src/routes/parentAlertRoutes.ts` — GET alerts, PATCH read/dismiss endpoints
> - `backend/src/index.ts` — daily digest timer (independent of queue processor)
> - `backend/src/services/emailService.ts` — parent email HTML templates added
> - `frontend/app/parent-monitor/page.tsx` — alerts tab + sidebar badge + overview banner
> - `frontend/lib/auth.ts` — `getAlerts()`, `markAlertRead()` API client methods
>
> **Estimated Effort**: Large (15+ implementation tasks)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Types → Alert service → Alert routes → Email templates → Digest timer → Frontend

---

## Context

### Issue (OCR-51)
**"Build parent alert system: when students NOT ON TASK, alert parent."**

### Server-Only Implementation
**This plan targets the production server (`vectorserver`) directly.** No local development. No git push. No CI/CD. All changes are written directly to `/home/nathan/ocr-kb-matcher/` on the server via SSH, then the backend is rebuilt and PM2-restarted. The local `C:\Users\64887\ocr-kb-matcher\` repo is **not** updated — it stays behind the server.

### User Decisions
- **Signals**: All 4 — quiz avoidance, inactivity, missed SM-2 reviews, off-topic uploads
- **Delivery**: Email + in-app
- **Thresholds**: Moderate — Quiz avoidance: 7 days, Inactivity: 5 days, Overdue reviews: 3 days
- **Alert lifecycle**: Auto-resolve when student corrects behavior

### Metis Review Gaps Addressed
- **Threshold ownership**: System defaults only (V1 — no configurable thresholds UI)
- **Digest batching**: One email per parent, all students summarized, to respect Brevo rate limits
- **Email provider**: Brevo SMTP (backend `emailService.ts`) — Resend is frontend-only, not available on server
- **Digest isolation**: Separate timer in `index.ts`, NOT added to `queueProcessor.ts`
- **Inactivity detection**: "Last activity" tracked via quiz completion, review submission, upload timestamps — no login tracking exists
- **Atomic writes**: All new alert JSON files use temp+rename pattern from `knowledgeGraphStorage.ts`
- **Alert cap**: Max 100 alerts per student, oldest pruned on write

### Scope Boundaries
- **IN**: Alert engine, daily digest email, in-app alert badge/banner, auto-resolution, off-topic detection at upload time
- **OUT**: Configurable threshold UI, real-time push notifications, SMS, multi-language emails, alert history analytics, student-facing alert preview

---

## Work Objectives

### Core Objective
Parents linked to students receive daily digest emails and in-app alerts when students are not on task.

### Concrete Deliverables
1. `backend/src/services/parentAlertService.ts` — Alert CRUD + signal computation (4 signals)
2. `backend/src/services/parentNotificationService.ts` — Email batching + send via Brevo
3. `backend/src/routes/parentAlertRoutes.ts` — Parent-facing alert API (GET /alerts, PATCH /read, PATCH /dismiss)
4. `backend/src/index.ts` — Daily digest timer (independent timer, fires once/day)
5. `backend/src/services/emailService.ts` — Parent alert HTML email templates
6. `frontend/app/parent-monitor/page.tsx` — Alerts tab + sidebar badge + overview warning banner
7. `frontend/lib/auth.ts` — `parentMonitorApi.getAlerts()`, `markAlertRead()`, `dismissAlert()` client methods

### Definition of Done
- [ ] `POST /api/parent-alerts/digest` can be triggered manually and sends one email per parent
- [ ] `GET /api/parent-monitor/alerts` returns alerts for linked students only
- [ ] Alert auto-resolves when student takes corrective action
- [ ] Frontend shows alert badge on student cards and banner on overview tab
- [ ] Deployed and verified on server via PM2 restart

### Must Have
- Daily digest email to all parents with linked students
- 4-signal alert computation at digest time
- Off-topic detection wired at upload time (confidence stored in job result)
- In-app alert badge + dismissible banner in parent dashboard
- Alert auto-resolution logic

### Must NOT Have
- Configurable threshold settings UI for parents
- Real-time push notifications
- SMS delivery
- Multi-language email templates

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.
> No test framework exists in this repo. All QA via curl + file checks + process inspection.

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.txt`.

- **Backend API**: Bash (curl) — send requests, assert status + response fields
- **Frontend**: Playwright (browser) — navigate, assert DOM, screenshot
- **Storage**: Bash (file existence) — verify JSON files created with correct shape
- **Email**: No automated email verification — checked via server log inspection

### No Automated Tests
- No test framework in this repo
- All verification done via `curl`, `grep`, file inspection

---

## Execution Strategy

### Server-Only Workflow
**All files are written directly to the server via SSH.** No local edits, no git, no CI/CD.
1. Write/edit files on server using `ssh` + `cat > /path/to/file << 'EOF'` or `sftp`
2. On server: `cd /home/nathan/ocr-kb-matcher/backend && npm run build`
3. On server: `pm2 restart backend && pm2 restart frontend`

### Parallel Waves

```
Wave 1 (Foundation — types + core alert service + signal wiring):
├── T1: Add ParentAlert types to shared/types.ts (on server)
├── T2: Create parentAlertService.ts (on server)
└── T3: Wire off-topic detection into jobProcessor.ts (on server)

Wave 2 (Backend API + email + digest timer):
├── T4: Create parentAlertRoutes.ts (on server)
├── T5: Add parent email HTML templates to emailService.ts (on server)
├── T6: Create parentNotificationService.ts (on server)
└── T7: Add daily digest timer to index.ts (on server)

Wave 3 (Frontend + integration):
├── T8: Add alert API methods to frontend/lib/auth.ts (on server)
└── T9: Add alerts tab + badges to parent-monitor/page.tsx (on server)

Wave FINAL: Build + PM2 restart + verify
└── T10: npm run build → pm2 restart → verify

Critical Path: T1 → T2 → T4 → T6 → T7 → T10
Parallel Speedup: T3 is independent of T1/T2; T5 is independent of T1-T4
```

### Dependency Matrix
- T1 (types): — → T2
- T2 (alert service): T1 → T3, T4
- T3 (off-topic wiring): — → (standalone, independent)
- T4 (routes): T2 → T6, T8
- T5 (email templates): — → T6
- T6 (notification service): T4, T5 → T7
- T7 (digest timer): T6 → T10
- T8 (frontend API): T4 → T9
- T9 (frontend UI): T8 → T10
- T10 (build + restart): T7, T9 → (end)

---

## TODOs

> **Server-only**: All files are written directly to `/home/nathan/ocr-kb-matcher/` on `vectorserver` via SSH. No local development, no git push, no CI/CD. Each task uses SSH to write files on the server, then the final task rebuilds and restarts.

- [x] 1. **Add `ParentAlert` types to `shared/types.ts`** *(server)*

  **What to do**: SSH to server and append to `/home/nathan/ocr-kb-matcher/shared/types.ts`:
  - `ParentAlert` interface: `{ id, parentId, studentId, studentName, type, severity, message, metadata, createdAt, resolvedAt, readAt, lastAlertedAt }`
  - `type` enum: `'quiz_avoidance' | 'inactivity' | 'overdue_reviews' | 'off_topic_upload'`
  - `severity` enum: `'warning' | 'critical'`
  - `ParentAlertSettings` (system defaults): `{ quizAvoidanceDays: 7, inactivityDays: 5, overdueReviewsDays: 3, offTopicConfidence: 0.3 }`

  **Must NOT do**: No per-user threshold config (V1), no notification channel config

  **Recommended Agent Profile**: `quick` — type additions only

  **Parallelization**: YES (Wave 1, with T2); **Blocks**: T2; **Blocked By**: None

  **References**: `shared/types.ts` — existing types file; `backend/src/types/auth.ts` — type pattern

  **Acceptance Criteria**:
  - [ ] `shared/types.ts` contains all new alert interfaces
  - [ ] Server build succeeds: `ssh vectorserver 'cd /home/nathan/ocr-kb-matcher/backend && npm run build 2>&1 | tail -5'`

  **QA Scenarios**:
  ```
  Scenario: Types compile without errors on server
    Tool: Bash
    Steps:
      1. ssh vectorserver "grep -n 'ParentAlert' /home/nathan/ocr-kb-matcher/shared/types.ts"
    Expected Result: Lines containing ParentAlert interfaces found
    Evidence: .sisyphus/evidence/task-1-types-on-server.txt
  ```

- [x] 2. **Create `backend/src/services/parentAlertService.ts`** *(server)*

  **What to do**: SSH to server, write `/home/nathan/ocr-kb-matcher/backend/src/services/parentAlertService.ts`:
  - Follow `knowledgeGraphStorage.ts` atomic write pattern (temp file + `fs.rename`)
  - Storage file: `backend/data/parent-alerts-{parentId}.json` (per-parent)
  - **Alert CRUD**: `getAlerts()`, `createAlert()`, `resolveAlert()`, `markAlertRead()`, `dismissAlert()`
  - **Signal checks** (moderate thresholds: 7d quiz, 5d inactivity, 3d reviews):
    - `checkQuizAvoidance(studentId)` — read `quiz-results-{studentId}.json`, latest `completedAt`
    - `checkInactivity(studentId)` — latest of quiz/review/upload timestamps
    - `checkOverdueReviews(studentId)` — read `reviews-{studentId}.json`, count overdue
    - `checkOffTopicUpload(studentId)` — read `off-topic-jobs-{studentId}.json` (T3)
  - **Deduplication**: skip if `lastAlertedAt` within 24h
  - **Alert cap**: max 100 per parent, prune oldest resolved then oldest unread
  - **Auto-resolution**: when signal re-checks, clear `resolvedAt` if student corrected

  **Must NOT do**: No AI calls, no email sending, no non-atomic writes

  **Recommended Agent Profile**: `unspecified-high` — complex file I/O logic

  **Parallelization**: YES (Wave 1, with T1, T3); **Blocks**: T4, T6; **Blocked By**: T1

  **References**:
  - `backend/src/services/knowledgeGraphStorage.ts` — atomic temp+rename pattern
  - `backend/src/services/parentLinkService.ts:249-281` — per-student data file reading pattern
  - `backend/src/services/reviewService.ts` — overdue review logic
  - `backend/src/services/quizStorage.ts` — `completedAt` timestamp location

  **Acceptance Criteria**:
  - [ ] File created on server at correct path
  - [ ] All 4 signal functions exported, return `{ triggered: boolean, details: object }`
  - [ ] Atomic writes via temp+rename
  - [ ] Alert cap at 100 enforced
  - [ ] 24h deduplication enforced

  **QA Scenarios**:
  ```
  Scenario: Service module loads on server
    Tool: Bash
    Preconditions: File written, server rebuilt
    Steps:
      1. ssh vectorserver "node -e \"process.chdir('/home/nathan/ocr-kb-matcher/backend'); const s = require('./dist/backend/src/services/parentAlertService'); console.log(typeof s.getAlerts, typeof s.checkQuizAvoidance)\""
    Expected Result: "function function"
    Evidence: .sisyphus/evidence/task-2-service-loads.txt
  ```

- [x] 3. **Wire off-topic detection into `backend/src/services/jobProcessor.ts`** *(server)*

  **What to do**: SSH to server, patch `/home/nathan/ocr-kb-matcher/backend/src/services/jobProcessor.ts`:
  - After AI matching step, check: `matchedNodes.length === 0` OR all confidences < 0.3
  - If off-topic: add `offTopic: true, matchConfidence: avgConfidence` to job result
  - Create `backend/data/off-topic-jobs-{studentId}.json` (append only, latest 20 entries)
  - `checkOffTopicUpload()` in alert service reads from this tracking file

  **Must NOT do**: No AI re-calls, no breaking schema changes, no immediate alerts

  **Recommended Agent Profile**: `quick` — targeted patch

  **Parallelization**: YES (Wave 1, independent); **Blocks**: T6 (notification service); **Blocked By**: None

  **References**:
  - `backend/src/services/jobProcessor.ts` — find `processJob()` and where `matchResults` is available
  - `backend/src/services/aiKnowledgeMatching.ts` — `matchedNodes` and `confidence` fields

  **Acceptance Criteria**:
  - [ ] New jobs get `offTopic` and `matchConfidence` in result JSON
  - [ ] `off-topic-jobs-{studentId}.json` created for off-topic uploads
  - [ ] Existing jobs not modified

  **QA Scenarios**:
  ```
  Scenario: Upload triggers off-topic tracking
    Tool: Bash
    Preconditions: Backend running
    Steps:
      1. ssh vectorserver "ls /home/nathan/ocr-kb-matcher/backend/data/off-topic-jobs-*.json 2>/dev/null || echo 'no files yet'"
    Expected Result: Either no files (on-topic so far) or files with job data
    Evidence: .sisyphus/evidence/task-3-offtopic-tracked.txt
  ```

- [x] 4. **Create `backend/src/routes/parentAlertRoutes.ts`** *(server)*

  **What to do**: SSH to server, write `/home/nathan/ocr-kb-matcher/backend/src/routes/parentAlertRoutes.ts` + patch `routes/index.ts` to mount it:
  - Follow `parentMonitor.ts` pattern: `asyncHandler` + `authenticate` + parent account type check
  - Mount: `router.use('/api/parent-monitor/alerts', parentAlertRoutes)` in `routes/index.ts`
  - **Routes**:
    - `GET /` — fetch alerts (filter: `?studentId=`, `?unread=true`, `?resolved=false`)
    - `GET /:alertId` — single alert
    - `PATCH /:alertId/read` — set `readAt = now`
    - `PATCH /:alertId/dismiss` — set `dismissedAt = now` (hidden from default view)
    - `POST /digest/trigger` — manual digest trigger (dev only: `NODE_ENV !== 'production'`)
  - Response: `{ success: true, data: { alerts: ParentAlert[], unreadCount: number } }`
  - Enforce: parent can only access alerts for their linked students (`isParentLinkedToStudent()`)

  **Must NOT do**: No raw student content in responses, no non-parent access

  **Recommended Agent Profile**: `unspecified-high` — routing + auth

  **Parallelization**: YES (Wave 2, with T5, T6); **Blocks**: T6, T8; **Blocked By**: T2

  **References**:
  - `backend/src/routes/parentMonitor.ts` — parent auth middleware, asyncHandler, link verification
  - `backend/src/routes/index.ts` — existing mount points

  **Acceptance Criteria**:
  - [ ] `GET /api/parent-monitor/alerts` → 200 with alert array
  - [ ] `PATCH /:id/read` → 200
  - [ ] `PATCH /:id/dismiss` → 200
  - [ ] Non-parent → 403
  - [ ] Unlinked student → 403

  **QA Scenarios**:
  ```
  Scenario: Alert routes respond correctly
    Tool: Bash
    Preconditions: Auth token for parent account
    Steps:
      1. ssh vectorserver "curl -s http://localhost:3001/api/parent-monitor/alerts -H 'Authorization: Bearer <token>'"
    Expected Result: {"success":true,"data":{"alerts":[...],"unreadCount":0}}
    Evidence: .sisyphus/evidence/task-4-alerts-api.txt
  ```

- [x] 5. **Add parent email HTML templates to `backend/src/services/emailService.ts`** *(server)*

  **What to do**: SSH to server, append to `/home/nathan/ocr-kb-matcher/backend/src/services/emailService.ts`:
  - `sendParentAlertEmail(parentEmail, parentName, alerts)` — real-time critical alert
  - `sendParentDigestEmail(parentEmail, parentName, students)` — daily digest (per-student cards)
  - Include: KIP header, parent greeting, alert list (type icon + severity badge + message), per-student digest card (reviews due, quiz status, activity), unsubscribe link, mobile-responsive inline CSS, plain text fallback
  - Validate `parentEmail` non-empty before sending

  **Must NOT do**: No raw student content, no hardcoded URLs, no send if email empty

  **Recommended Agent Profile**: `writing` — HTML email template

  **Parallelization**: YES (Wave 2, independent); **Blocks**: T6; **Blocked By**: None

  **References**:
  - `backend/src/services/emailService.ts` — existing nodemailer + Brevo SMTP pattern
  - `frontend/components/email/VerificationEmail.tsx` — styling reference

  **Acceptance Criteria**:
  - [ ] Both template functions exported
  - [ ] Return `Promise<{ success: boolean, messageId?: string }>`
  - [ ] Include unsubscribe link placeholder
  - [ ] No raw student content

  **QA Scenarios**:
  ```
  Scenario: Email templates load as functions
    Tool: Bash
    Preconditions: File updated, server rebuilt
    Steps:
      1. ssh vectorserver "node -e \"const e = require('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/emailService'); console.log(typeof e.sendParentAlertEmail, typeof e.sendParentDigestEmail)\""
    Expected Result: "function function"
    Evidence: .sisyphus/evidence/task-5-template-exports.txt
  ```

- [x] 6. **Create `backend/src/services/parentNotificationService.ts`** *(server)*

  **What to do**: SSH to server, write `/home/nathan/ocr-kb-matcher/backend/src/services/parentNotificationService.ts`:
  - `sendDailyDigest()`:
    1. Read all parent-student links from `data/parent-student-links.json`
    2. Group by `parentId` — one email per parent
    3. For each student: run all 4 signal checks from `parentAlertService`
    4. If triggered: `createAlert()` + set `lastAlertedAt`
    5. Build per-student digest payload
    6. If `parentEmail` non-empty: call `sendParentDigestEmail()`
    7. Retry 3x with exponential backoff on failure (follow `ai.ts` pattern)
  - `checkAndAutoResolve()`: re-check signals, call `resolveAlert()` if student corrected
  - `sendImmediateAlert(parentId, alert)`: for critical off-topic uploads, send immediately

  **Must NOT do**: No iterating all users (only linked parents), no send if email empty, no blocking

  **Recommended Agent Profile**: `unspecified-high` — orchestration + async

  **Parallelization**: YES (Wave 2, with T4, T5); **Blocks**: T7; **Blocked By**: T2, T5

  **References**:
  - `backend/src/services/ai.ts` — exponential backoff retry pattern
  - `backend/src/services/parentLinkService.ts` — reading links
  - `backend/src/services/parentAlertService.ts` — signal functions

  **Acceptance Criteria**:
  - [ ] Groups alerts per parent, one email each
  - [ ] Retry with backoff on email failure
  - [ ] Skips parents with empty `parentEmail`
  - [ ] Auto-resolve runs after storing alerts

  **QA Scenarios**:
  ```
  Scenario: Digest processes all linked parent-student pairs
    Tool: Bash
    Preconditions: Digest manually triggered
    Steps:
      1. ssh vectorserver "curl -s -X POST http://localhost:3001/api/parent-monitor/alerts/digest/trigger -H 'Authorization: Bearer <token>'"
      2. ssh vectorserver "grep -i 'sendParentDigest\|parentEmail\|digest.*triggered' /home/nathan/.pm2/logs/backend-out-1.log | tail -10"
    Expected Result: Digest log entry, one email per unique parent
    Evidence: .sisyphus/evidence/task-6-digest-log.txt
  ```

- [x] 7. **Add daily digest timer to `backend/src/index.ts`** *(server)*

  **What to do**: SSH to server, patch `/home/nathan/ocr-kb-matcher/backend/src/index.ts`:
  - After KG storage init + queue processor init in `main()`:
    1. Read `PARENT_DIGEST_HOUR_UTC` (default: 9) and `PARENT_DIGEST_ENABLED` (default: true) from env
    2. Calculate ms until next N:00 UTC
    3. `setTimeout(triggerDigest, msUntilNext)` → first fire
    4. `setInterval(triggerDigest, 86400000)` → subsequent fires every 24h
  - `triggerDigest()`: call `sendDailyDigest()`, log result `{ triggered: true, parents: N, emailsSent: N, errors: [] }`
  - Add to graceful shutdown (SIGTERM/SIGINT): `clearTimeout` + `clearInterval`
  - Add manual trigger: `POST /api/parent-alerts/digest/trigger` endpoint (dev only)

  **Must NOT do**: No digest logic in queueProcessor, no blocking on startup, no setInterval-only first fire

  **Recommended Agent Profile**: `quick` — targeted insertion

  **Parallelization**: NO (sequential after T6); **Blocks**: T10; **Blocked By**: T6

  **References**:
  - `backend/src/index.ts` — existing startup sequence, graceful shutdown
  - `backend/src/services/queueProcessor.ts` — `startPolling()` timer pattern

  **Acceptance Criteria**:
  - [ ] Digest fires at configured UTC hour
  - [ ] `PARENT_DIGEST_HOUR_UTC` and `PARENT_DIGEST_ENABLED` env vars respected
  - [ ] Graceful shutdown clears timers
  - [ ] Result logged

  **QA Scenarios**:
  ```
  Scenario: Digest timer initialized on backend restart
    Tool: Bash
    Preconditions: Backend restarted with new index.ts
    Steps:
      1. ssh vectorserver "export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH; pm2 restart backend"
      2. ssh vectorserver "sleep 5; grep -i 'parent.*digest\|digest.*timer\|parent.*alert' /home/nathan/.pm2/logs/backend-out-1.log | tail -5"
    Expected Result: Log entry showing digest scheduler initialized
    Evidence: .sisyphus/evidence/task-7-timer-init.txt
  ```

- [x] 8. **Add alert API methods to `frontend/lib/auth.ts`** *(server)*

  **What to do**: SSH to server, patch `/home/nathan/ocr-kb-matcher/frontend/lib/auth.ts`:
  - Add to `parentMonitorApi`:
    - `getAlerts(studentId?: string, unreadOnly?: boolean)` → `GET /api/parent-monitor/alerts`
    - `markAlertRead(alertId: string)` → `PATCH /api/parent-monitor/alerts/:id/read`
    - `dismissAlert(alertId: string)` → `PATCH /api/parent-monitor/alerts/:id/dismiss`
    - `getAlertDetail(alertId: string)` → `GET /api/parent-monitor/alerts/:id`
  - Return shape: `{ success: true, data: { alerts: ParentAlert[], unreadCount: number } }`
  - Add TypeScript interfaces for new response shapes

  **Must NOT do**: No changes to existing methods, no polling logic here

  **Recommended Agent Profile**: `quick` — API client additions

  **Parallelization**: YES (Wave 3, with T9); **Blocks**: T9; **Blocked By**: T4

  **References**: `frontend/lib/auth.ts` — existing `parentMonitorApi` pattern

  **Acceptance Criteria**:
  - [ ] All 4 methods present in `parentMonitorApi`
  - [ ] TypeScript compiles: `ssh vectorserver "cd /home/nathan/ocr-kb-matcher/frontend && npx tsc --noEmit 2>&1 | head -10"`

  **QA Scenarios**:
  ```
  Scenario: Alert API methods exist in frontend auth file
    Tool: Bash
    Steps:
      1. ssh vectorserver "grep -n 'getAlerts\|markAlertRead\|dismissAlert' /home/nathan/ocr-kb-matcher/frontend/lib/auth.ts"
    Expected Result: All 3 methods found
    Evidence: .sisyphus/evidence/task-8-api-methods.txt
  ```

- [x] 9. **Add alerts tab + badges to `frontend/app/parent-monitor/page.tsx`** *(server)*

  **What to do**: SSH to server, patch `/home/nathan/ocr-kb-matcher/frontend/app/parent-monitor/page.tsx`:
  - **Sidebar**: red badge with unread count per student card (`<span className="absolute...">`)
  - **Overview tab banner**: dismissible warning when student has active alerts (calls `markAlertRead()` on dismiss)
  - **Alerts tab** (add to `activeTab`): list alerts with type icon, severity badge, message, time ago; filter tabs: All | Unread | Resolved; Mark as Read + Dismiss actions per alert; empty state "No alerts — {name} is on track!"
  - Use `useToast()` for action feedback; poll `getAlerts()` every 60s on alerts tab
  - Follow `frontend/AGENTS.md` styling: glass cards, dark mode, `clsx`/`cn`, `theme === 'dark'` checks

  **Must NOT do**: No raw student content, no skipping `clsx`/`cn`, no hardcoded colors without dark mode

  **Recommended Agent Profile**: `visual-engineering` — new UI section with interactive state

  **Parallelization**: YES (Wave 3, with T8); **Blocks**: T10; **Blocked By**: T8

  **References**:
  - `frontend/app/parent-monitor/page.tsx` — existing page structure
  - `frontend/AGENTS.md` — styling conventions (mandatory read)
  - `frontend/components/ui/` — reusable badge/button components

  **Acceptance Criteria**:
  - [ ] Red unread badge on sidebar student cards
  - [ ] Warning banner on overview tab when alerts exist
  - [ ] "Alerts" tab visible and functional
  - [ ] Mark as Read / Dismiss buttons work
  - [ ] Full dark mode support

  **QA Scenarios**:
  ```
  Scenario: Alerts tab visible and shows alert list
    Tool: Bash (Playwright on server frontend)
    Preconditions: Parent account, alerts exist for linked student
    Steps:
      1. ssh vectorserver "curl -s http://localhost:3000/parent-monitor -o /dev/null -w '%{http_code}'"
    Expected Result: 200 (frontend serving)
    Evidence: .sisyphus/evidence/task-9-frontend-serving.txt

  Scenario: Alert API returns data for frontend
    Tool: Bash
    Steps:
      1. ssh vectorserver "curl -s http://localhost:3000/api/parent-monitor/alerts -H 'Authorization: Bearer <token>' | head -c 300"
    Expected Result: JSON with alerts array
    Evidence: .sisyphus/evidence/task-9-alerts-in-frontend.txt
  ```

- [x] 10. **Build + PM2 restart + verify** *(server)*

  **What to do** (all via SSH to `vectorserver`):
  1. `cd /home/nathan/ocr-kb-matcher/backend && npm run build`
  2. `export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH && pm2 restart backend && pm2 restart frontend`
  3. Verify: `curl http://localhost:3001/api/parent-monitor/alerts` → 200
  4. Trigger digest: `curl -X POST http://localhost:3001/api/parent-monitor/alerts/digest/trigger -H "Authorization: Bearer <token>"`
  5. Check PM2 logs: `grep -i "digest\|parent.*alert\|parentAlert" /home/nathan/.pm2/logs/backend-out-1.log | tail -10`

  **Must NOT do**: No `pm2 restart all` (leave proxy-https alone), no skip build step

  **Recommended Agent Profile**: `unspecified-high` — server ops; **Skills**: [`ssh-connection`]

  **Parallelization**: NO (sequential final step); **Blocked By**: T7, T9

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds
  - [ ] `pm2 restart backend && pm2 restart frontend` succeed
  - [ ] `curl localhost:3001/` → 200
  - [ ] Digest trigger → log entry
  - [ ] Frontend `/parent-monitor` → 200

  **QA Scenarios**:
  ```
  Scenario: Backend fully restarted with new alert code
    Tool: Bash
    Steps:
      1. ssh vectorserver "curl -s http://localhost:3001/ | head -c 100"
    Expected Result: Backend JSON response (200)
    Evidence: .sisyphus/evidence/task-10-backend-ok.txt

  Scenario: Digest manually triggered and logged
    Tool: Bash
    Steps:
      1. ssh vectorserver "curl -s -X POST 'http://localhost:3001/api/parent-monitor/alerts/digest/trigger' -H 'Authorization: Bearer <token>'"
      2. ssh vectorserver "grep -i 'digest.*triggered\|sendParentDigest' /home/nathan/.pm2/logs/backend-out-1.log | tail -3"
    Expected Result: Digest triggered log entry
    Evidence: .sisyphus/evidence/task-10-digest-fired.txt
  ```



- [x] 1. **Add `ParentAlert` types to `shared/types.ts`**

  **What to do**:
  - Add `ParentAlert` interface: `{ id, parentId, studentId, studentName, type, severity, message, metadata, createdAt, resolvedAt, readAt, lastAlertedAt }`
  - Add alert `type` enum: `'quiz_avoidance' | 'inactivity' | 'overdue_reviews' | 'off_topic_upload'`
  - Add `severity` enum: `'warning' | 'critical'`
  - Add `ParentAlertSettings` type for default thresholds: `{ quizAvoidanceDays: 7, inactivityDays: 5, overdueReviewsDays: 3, offTopicConfidence: 0.3 }`
  - Add `ParentAlertDigest` type for daily digest email payload
  - Export all types from `shared/types.ts`

  **Must NOT do**:
  - Do NOT add per-user threshold config — use system defaults only (V1)
  - Do NOT add notification channel config — email + in-app only (V1)

  **Recommended Agent Profile**:
  - **Category**: `quick` — simple type additions, no logic
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2)
  - **Blocks**: T2 (alert service imports these types)
  - **Blocked By**: None

  **References**:
  - `shared/types.ts` — existing types file, add alongside `User`, `KnowledgeNode`, etc.
  - `backend/src/types/auth.ts` — existing auth types pattern (export interface + type alias)
  - `backend/src/types/` — other type files for naming conventions

  **Acceptance Criteria**:
  - [ ] `shared/types.ts` contains `ParentAlert`, `ParentAlertType`, `ParentAlertSeverity`, `ParentAlertSettings`, `ParentAlertDigest` interfaces
  - [ ] `cd backend && npx tsc --noEmit` passes for types
  - [ ] All types exported from `shared/types.ts`

  **QA Scenarios**:

  \`\`\`
  Scenario: Types compile without errors
    Tool: Bash
    Preconditions: Types added to shared/types.ts
    Steps:
      1. Run: cd backend && npx tsc --noEmit 2>&1 | head -20
    Expected Result: No type errors related to the new ParentAlert types
    Failure Indicators: "cannot find name 'ParentAlert'", duplicate identifier
    Evidence: .sisyphus/evidence/task-1-types-compile.txt
  \`\`\`

  **Commit**: NO (grouped with T2)

- [x] 2. **Create `backend/src/services/parentAlertService.ts`**

  **What to do**:
  - Create `parentAlertService.ts` following `knowledgeGraphStorage.ts` pattern (singleton export + atomic writes)
  - **File**: `backend/data/parent-alerts-{parentId}.json` (per-parent alert store)
  - **Atomic writes**: Use temp file + `fs.rename` (same as `knowledgeGraphStorage.ts`)
  - **Alert functions**:
    - `getAlerts(parentId, studentId?)` — read alerts for parent, optionally filter by student
    - `createAlert(alert)` — add new alert, cap at 100 per parent, prune oldest
    - `resolveAlert(alertId, parentId)` — set `resolvedAt` timestamp
    - `markAlertRead(alertId, parentId)` — set `readAt` timestamp
    - `dismissAlert(alertId, parentId)` — parent manually dismisses (soft delete, keeps in file with dismissed flag)
  - **Signal computation functions** (called at digest time):
    - `checkQuizAvoidance(studentId, thresholdDays = 7)` — read `quiz-results-{studentId}.json`, find latest `completedAt`, return true if > threshold days
    - `checkInactivity(studentId, thresholdDays = 5)` — read latest activity from quiz results, reviews, or uploads, return true if no activity > threshold
    - `checkOverdueReviews(studentId, thresholdDays = 3)` — use `reviewService.getDueReviews()` or read `reviews-{studentId}.json` directly, return true if any review `nextReviewDate` is overdue by > threshold days
    - `checkOffTopicUpload(studentId)` — read latest job result for this student, check if `matchConfidence < 0.3` stored at upload time
  - **Alert deduplication**: `lastAlertedAt` timestamp — skip creating alert if same type for same student was alerted within 24h
  - **Auto-resolution check**: After creating alerts, check if any resolved alerts should be re-triggered (student corrected behavior)
  - Max 100 alerts per parent — on write, remove oldest resolved then oldest unread if over limit

  **Must NOT do**:
  - Do NOT call Moonshot AI during signal computation — use stored data only
  - Do NOT iterate all users — signal check is called per student from digest loop
  - Do NOT send emails from this service — separate notification service handles sending
  - Do NOT use non-atomic writes (`fs.writeFile`) — use temp+rename always

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — complex logic, file I/O, multiple data sources
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3)
  - **Blocks**: T5 (routes import service), T7 (notification service calls signal functions)
  - **Blocked By**: T1 (types)

  **References**:
  - `backend/src/services/knowledgeGraphStorage.ts` — atomic write pattern: temp file + rename, singleton getter pattern
  - `backend/src/services/parentLinkService.ts:249-281` — `getStudentDashboardData()` pattern for reading per-student data files
  - `backend/src/services/reviewService.ts` — `getDueReviews()` function signature for overdue check
  - `backend/src/services/quizStorage.ts` — quiz results file structure (completedAt timestamps)
  - `backend/src/services/jobService.ts` — job result structure for matchConfidence

  **Acceptance Criteria**:
  - [ ] File `backend/src/services/parentAlertService.ts` created
  - [ ] All 4 signal check functions exported and return `Promise<{ triggered: boolean, details: object }>`
  - [ ] Atomic write pattern used (temp + rename)
  - [ ] Alert cap at 100 enforced
  - [ ] Deduplication within 24h enforced

  **QA Scenarios**:

  \`\`\`
  Scenario: createAlert writes to JSON with correct shape
    Tool: Bash
    Preconditions: Service created, a parent ID exists in parent-student-links.json
    Steps:
      1. Create a test alert directly via Node REPL: node -e "process.chdir('/tmp'); const s = require('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/parentAlertService'); console.log(typeof s.createAlert)"
    Expected Result: Function exists and is callable
    Failure Indicators: Module not found, function undefined
    Evidence: .sisyphus/evidence/task-2-service-exports.txt

  Scenario: Signal functions return correct structure
    Tool: Bash
    Preconditions: Student exists with quiz results
    Steps:
      1. curl http://localhost:3001/api/parent-monitor/students -H "Authorization: Bearer <parent-token>"
    Expected Result: Returns linked students list (200)
    Failure Indicators: 403, empty data
    Evidence: .sisyphus/evidence/task-2-signal-baseline.txt
  \`\`\`

  **Commit**: NO (grouped with T1)

- [x] 3. **Wire off-topic detection into `backend/src/services/jobProcessor.ts`**

  **What to do**:
  - At the end of `processJob()` (after AI matching step), check `matchResults.matchedNodes.length === 0` OR all confidences < 0.3
  - If off-topic: store `{ offTopic: true, confidence: avgConfidence }` in the job's metadata/result
  - Result stored in `data/job-results-{jobId}.json` — the off-topic flag should be added to this file
  - Also index off-topic jobs per student in a simple tracking file `data/off-topic-jobs-{studentId}.json` (append only, latest 20 entries) so digest doesn't need to scan all job files
  - The `checkOffTopicUpload()` in alert service will read from this tracking file

  **Must NOT do**:
  - Do NOT change the existing job result JSON schema in a breaking way — only ADD new fields
  - Do NOT call AI again — just use the already-computed match results
  - Do NOT alert parents immediately — only store the flag for digest-time evaluation

  **Recommended Agent Profile**:
  - **Category**: `quick` — targeted insertion point in existing code
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (independent of T1, T2)
  - **Parallel Group**: Wave 1
  - **Blocks**: T7 (notification service needs off-topic flag)
  - **Blocked By**: None

  **References**:
  - `backend/src/services/jobProcessor.ts` — find `processJob()` method, locate where `matchResults` is computed
  - `backend/src/services/aiKnowledgeMatching.ts` — find `matchResults` structure, check `matchedNodes` and `confidence` fields
  - `backend/src/services/jobService.ts` — how job results are saved to JSON

  **Acceptance Criteria**:
  - [ ] After AI matching, job result JSON includes `offTopic: boolean` and `matchConfidence: number` fields
  - [ ] `data/off-topic-jobs-{studentId}.json` created when off-topic upload detected
  - [ ] Existing job results not modified (only new jobs affected)

  **QA Scenarios**:

  \`\`\`
  Scenario: Upload a test job and verify off-topic flag stored
    Tool: Bash
    Preconditions: Backend running, upload a document
    Steps:
      1. curl -X POST http://localhost:3001/api/upload -F "file=@/tmp/test.pdf" -H "Authorization: Bearer <token>"
      2. sleep 10
      3. ls /home/nathan/ocr-kb-matcher/backend/data/off-topic-jobs-*.json 2>/dev/null || echo "no off-topic file"
    Expected Result: Either no file (on-topic) or file exists with job data
    Failure Indicators: Crash, unhandled error in job processor
    Evidence: .sisyphus/evidence/task-3-offtopic-wired.txt
  \`\`\`

  **Commit**: NO (grouped with T5)

- [x] 4. **Create `backend/src/routes/parentAlertRoutes.ts`**

  **What to do**:
  - Create `backend/src/routes/parentAlertRoutes.ts` following `parentMonitor.ts` pattern
  - Mount in `backend/src/routes/index.ts`: `router.use('/api/parent-monitor/alerts', parentAlertRoutes)`
  - **Auth**: All routes require JWT auth + `accountType === 'parent'`
  - **Routes**:
    - `GET /` — fetch all alerts for parent (filter by `?studentId=xxx`, `?unread=true`, `?resolved=false`)
    - `GET /:alertId` — fetch single alert detail
    - `PATCH /:alertId/read` — mark alert as read (`readAt = now`)
    - `PATCH /:alertId/dismiss` — parent dismisses alert (`dismissedAt = now`, alert removed from default view)
    - `POST /digest` — manually trigger digest email for this parent (dev/admin only, guarded by `NODE_ENV !== 'production'` OR check for admin token)
  - Response shape: `{ success: true, data: { alerts: ParentAlert[], unreadCount: number } }`
  - Only return alerts for students the parent is actually linked to — enforce via `isParentLinkedToStudent()`

  **Must NOT do**:
  - Do NOT expose alerts for students not linked to this parent
  - Do NOT expose raw student content in alert messages — only metadata
  - Do NOT allow non-parent accounts to access any route

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — backend routing, auth middleware, data filtering
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6)
  - **Blocks**: T8 (frontend API client)
  - **Blocked By**: T2 (imports alert service)

  **References**:
  - `backend/src/routes/parentMonitor.ts` — parent auth middleware pattern, asyncHandler usage, link verification pattern
  - `backend/src/routes/index.ts` — mount point example: `router.use('/api/parent-monitor', parentMonitorRoutes)`

  **Acceptance Criteria**:
  - [ ] `GET /api/parent-monitor/alerts` returns 200 with alert array for parent
  - [ ] `GET /api/parent-monitor/alerts?studentId=xxx` filters correctly
  - [ ] `PATCH /api/parent-monitor/alerts/:id/read` returns 200, sets readAt
  - [ ] `PATCH /api/parent-monitor/alerts/:id/dismiss` returns 200, hides alert
  - [ ] Non-linked student alerts return 403
  - [ ] Non-parent account returns 403

  **QA Scenarios**:

  \`\`\`
  Scenario: Parent fetches their alerts
    Tool: Bash
    Preconditions: Alert exists in parent-alerts JSON file
    Steps:
      1. curl -s http://localhost:3001/api/parent-monitor/alerts -H "Authorization: Bearer <parent-token>"
    Expected Result: {"success":true,"data":{"alerts":[...],"unreadCount":1}} (200)
    Failure Indicators: 403, 500, empty data array when alert exists
    Evidence: .sisyphus/evidence/task-4-get-alerts.txt

  Scenario: Non-parent account cannot access alerts
    Tool: Bash
    Preconditions: Student account token
    Steps:
      1. curl -s http://localhost:3001/api/parent-monitor/alerts -H "Authorization: Bearer <student-token>"
    Expected Result: 403 Forbidden
    Failure Indicators: 200, 500
    Evidence: .sisyphus/evidence/task-4-auth-guard.txt

  Scenario: Mark alert as read
    Tool: Bash
    Preconditions: Alert ID known
    Steps:
      1. curl -s -X PATCH http://localhost:3001/api/parent-monitor/alerts/{alertId}/read -H "Authorization: Bearer <parent-token>"
    Expected Result: {"success":true} (200)
    Failure Indicators: 403, 404, 500
    Evidence: .sisyphus/evidence/task-4-mark-read.txt
  \`\`\`

  **Commit**: NO (grouped with T5)

- [x] 5. **Add parent email HTML templates to `backend/src/services/emailService.ts`**

  **What to do**:
  - Add two new email template functions to `emailService.ts`:
    - `sendParentAlertEmail(parentEmail, parentName, alerts)` — real-time single alert (used for critical signals)
    - `sendParentDigestEmail(parentEmail, parentName, students)` — daily digest with per-student summary
  - HTML templates must include:
    - App logo/name header: "KIP — Knowledge Intelligence Platform"
    - Parent greeting: "Hello {parentName}"
    - Alert list: type icon, severity badge, student name, message, time
    - Digest summary: per-student card with (learned this week, reviews due, quiz score, streak)
    - Unsubscribe link placeholder (bottom): `https://mastri.app/settings?unsubscribe=...`
    - Mobile-responsive design (match existing verification email style)
    - Plain text fallback for non-HTML email clients
  - Templates use inline CSS (email client compatibility)
  - Validate `parentEmail` is non-empty before calling nodemailer

  **Must NOT do**:
  - Do NOT include raw student content (OCR text, quiz questions) — only metadata
  - Do NOT hardcode URLs — use environment variable for base URL
  - Do NOT send if `parentEmail` is empty or missing from link record

  **Recommended Agent Profile**:
  - **Category**: `writing` — HTML email template construction
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T7)
  - **Blocks**: T7 (notification service imports these templates)
  - **Blocked By**: None

  **References**:
  - `backend/src/services/emailService.ts` — existing `sendVerificationEmail()` template pattern, nodemailer usage, Brevo SMTP config
  - React Email `VerificationEmail.tsx` in frontend for styling reference (gradient header, card layout)

  **Acceptance Criteria**:
  - [ ] `emailService.ts` exports `sendParentAlertEmail()` and `sendParentDigestEmail()`
  - [ ] Both functions return `Promise<{ success: boolean, messageId?: string }>`
  - [ ] Email includes unsubscribe link placeholder
  - [ ] No raw student content in email body

  **QA Scenarios**:

  \`\`\`
  Scenario: Email template function executes without error
    Tool: Bash
    Preconditions: Email service updated
    Steps:
      1. node -e "const e = require('/home/nathan/ocr-kb-matcher/backend/dist/backend/src/services/emailService'); console.log(typeof e.sendParentAlertEmail, typeof e.sendParentDigestEmail)"
    Expected Result: "function function" (both are functions)
    Failure Indicators: "undefined"
    Evidence: .sisyphus/evidence/task-5-template-exports.txt
  \`\`\`

  **Commit**: NO (grouped with T7)

- [x] 6. **Create `backend/src/services/parentNotificationService.ts`**

  **What to do**:
  - Create `parentNotificationService.ts` — orchestrates alert computation + email sending
  - `sendDailyDigest()`:
    1. Read all parent-student links from `parent-student-links.json`
    2. Group links by `parentId` (one email per parent)
    3. For each student linked to this parent, run all 4 signal checks from `parentAlertService`
    4. Collect triggered alerts — if any, store via `parentAlertService.createAlert()` + mark `lastAlertedAt`
    5. Build digest payload: per-student summary (alert types triggered, counts, key stats)
    6. If `parentEmail` exists and non-empty, call `sendParentDigestEmail()`
    7. Use exponential backoff retry (3 attempts) if email fails — pattern from `ai.ts`
  - `sendImmediateAlert(parentId, alert)`:
    - For critical alerts (off-topic uploads), send immediately after storing alert
    - Same retry logic
  - `checkAndAutoResolve()`:
    - After storing new alerts, check if any previously resolved alerts should be re-triggered
    - Example: student was overdue on reviews → completed reviews → overdue alert resolves automatically
    - Call `parentAlertService.resolveAlert()` for each auto-resolved alert

  **Must NOT do**:
  - Do NOT iterate all users — only users with parent links (filter from `parent-student-links.json`)
  - Do NOT send email if `parentEmail` is empty — log warning and skip
  - Do NOT block the main server — all email sending is async

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — orchestration logic, async operations
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5)
  - **Blocks**: T8 (digest timer calls this service)
  - **Blocked By**: T2 (signal functions), T5 (email templates)

  **References**:
  - `backend/src/services/ai.ts:retryWithBackoff()` — retry pattern to follow
  - `backend/src/services/parentLinkService.ts` — reading parent-student links
  - `backend/src/services/parentAlertService.ts` — signal check functions (T2)

  **Acceptance Criteria**:
  - [ ] `sendDailyDigest()` processes all parent-student links
  - [ ] Groups alerts per parent — one email per parent, not one per student
  - [ ] Retry with exponential backoff on email failure
  - [ ] Skips parents with empty `parentEmail`
  - [ ] Auto-resolve logic checks and resolves alerts when student corrects behavior

  **QA Scenarios**:

  \`\`\`
  Scenario: sendDailyDigest sends one email per parent
    Tool: Bash
    Preconditions: Multiple students linked to same parent
    Steps:
      1. curl -X POST http://localhost:3001/api/parent-alerts/digest -H "Authorization: Bearer <admin-token>"
      2. sleep 5
      3. ssh vectorserver 'grep -i "sendParentDigest\|parentEmail" /home/nathan/.pm2/logs/backend-out-1.log | tail -10'
    Expected Result: One email log entry per unique parent
    Failure Indicators: Multiple emails to same parent, email skipped for valid parent
    Evidence: .sisyphus/evidence/task-6-digest-sent.txt
  \`\`\`

  **Commit**: NO (grouped with T7)

- [x] 7. **Add daily digest timer to `backend/src/index.ts`**

  **What to do**:
  - After queue processor initialization in `main()`, add a separate daily digest timer
  - **Trigger time**: 09:00 server time UTC daily (configurable via `PARENT_DIGEST_HOUR_UTC=9` env var)
  - **Implementation**: `setTimeout` + `setInterval` pattern:
    1. Calculate ms until next 9:00 UTC
    2. `setTimeout(triggerDigest, msUntil9am)` — first fire
    3. `setInterval(triggerDigest, 24 * 60 * 60 * 1000)` — subsequent fires every 24h
  - `triggerDigest()`: call `sendDailyDigest()` from `parentNotificationService`, log result
  - Handle graceful shutdown: clear timers on SIGTERM/SIGINT
  - **Env vars to read**: `PARENT_DIGEST_HOUR_UTC` (default: 9), `PARENT_DIGEST_ENABLED` (default: true)
  - Also add manual trigger endpoint or PM2 signal: if `process.send('digest')` received, trigger immediately

  **Must NOT do**:
  - Do NOT add digest logic inside `queueProcessor.ts` or `processNextJob()` — keep separate
  - Do NOT block server startup — digest is fully async
  - Do NOT use `setInterval` alone for first fire — use `setTimeout` to align to exact time

  **Recommended Agent Profile**:
  - **Category**: `quick` — targeted insertion, clear pattern
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: NO — sequential after T6
  - **Blocks**: T11 (server deploy)
  - **Blocked By**: T6

  **References**:
  - `backend/src/index.ts` — existing startup sequence, graceful shutdown pattern (SIGTERM handler)
  - `backend/src/services/queueProcessor.ts` — `startPolling()` pattern for timer management

  **Acceptance Criteria**:
  - [ ] Digest fires once at startup + then every 24h at configured hour
  - [ ] Env vars `PARENT_DIGEST_HOUR_UTC` and `PARENT_DIGEST_ENABLED` respected
  - [ ] Graceful shutdown clears timers properly
  - [ ] Digest result logged: `{ triggered: true, parents: N, emailsSent: N, errors: [] }`

  **QA Scenarios**:

  \`\`\`
  Scenario: Digest timer initializes on server startup
    Tool: Bash
    Preconditions: Backend restarted with new index.ts
    Steps:
      1. ssh vectorserver 'export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH; pm2 restart backend'
      2. sleep 5
      3. ssh vectorserver 'grep -i "digest\|parent.*alert" /home/nathan/.pm2/logs/backend-out-1.log | tail -5'
    Expected Result: Log entry showing digest timer initialized
    Failure Indicators: Crash on startup, digest not scheduled
    Evidence: .sisyphus/evidence/task-7-timer-init.txt
  \`\`\`

  **Commit**: NO (grouped with T8)

- [x] 9. **Add alerts to parent monitor dashboard (`frontend/app/parent-monitor/page.tsx`)**

  **What to do**:
  - Add to `parentMonitorApi` object in `frontend/lib/auth.ts`:
    - `getAlerts(studentId?: string, unreadOnly?: boolean)` → `GET /api/parent-monitor/alerts?studentId=xxx&unread=true`
    - `markAlertRead(alertId: string)` → `PATCH /api/parent-monitor/alerts/:id/read`
    - `dismissAlert(alertId: string)` → `PATCH /api/parent-monitor/alerts/:id/dismiss`
    - `getAlertDetail(alertId: string)` → `GET /api/parent-monitor/alerts/:id`
  - Return shape: `{ success: true, data: { alerts: ParentAlert[], unreadCount: number } }`
  - All methods use existing auth-aware fetch pattern (Bearer token from localStorage)
  - Add TypeScript interfaces: `ParentAlert`, `AlertResponse` if not already in `frontend/lib/auth.ts`

  **Must NOT do**:
  - Do NOT change existing `parentMonitorApi` methods (students list, overview, etc.)
  - Do NOT add polling/auto-refresh here — handle in component

  **Recommended Agent Profile**:
  - **Category**: `quick` — straightforward API client additions
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9)
  - **Blocks**: T10 (frontend component uses these methods)
  - **Blocked By**: T4 (backend routes must exist first)

  **References**:
  - `frontend/lib/auth.ts` — existing `parentMonitorApi` object, auth fetch pattern, Bearer token injection

  **Acceptance Criteria**:
  - [ ] `parentMonitorApi.getAlerts()` returns `Promise<AlertResponse>`
  - [ ] `parentMonitorApi.markAlertRead(id)` returns `Promise<{ success: boolean }>`
  - [ ] `parentMonitorApi.dismissAlert(id)` returns `Promise<{ success: boolean }>`
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:

  \`\`\`
  Scenario: API methods exported and typed correctly
    Tool: Bash
    Preconditions: Auth file updated
    Steps:
      1. grep -n "getAlerts\|markAlertRead\|dismissAlert" frontend/lib/auth.ts
    Expected Result: All 3 methods found in parentMonitorApi object
    Failure Indicators: Method missing, wrong shape
    Evidence: .sisyphus/evidence/task-8-api-methods.txt
  \`\`\`

  **Commit**: NO (grouped with T9)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify T1-T11 all addressed. Check evidence files exist.

- [x] F2. **Code Quality Review** — `unspecified-high`
  `cd backend && npx tsc --noEmit`. Review new files for `as any`, empty catches, console.log in prod.

- [x] F3. **Real Manual QA** — `unspecified-high`
  Trigger digest manually. Verify email log entry. Verify alert badge appears in frontend.

- [x] F4. **Scope Fidelity Check** — `deep`
  Verify no out-of-scope features added (no configurable thresholds, no SMS, no real-time push).

---

## Commit Strategy

- **T1-T2**: `feat(alerts): add alert types and storage service` — shared/types.ts, parentAlertService.ts
- **T3**: `fix(jobs): store AI confidence for off-topic detection` — jobProcessor.ts
- **T5**: `feat(alerts): add parent alert API routes` — parentAlertRoutes.ts
- **T6-T7**: `feat(alerts): add parent notification email service` — emailService.ts, parentNotificationService.ts
- **T8**: `feat(alerts): add daily digest timer` — index.ts
- **T9-T10**: `feat(frontend): add alert tab and badges to parent dashboard` — lib/auth.ts, parent-monitor/page.tsx
- **T11**: `chore(server): deploy parent alert system` — PM2 restart

---

## Success Criteria

### Verification Commands
```bash
# Manual digest trigger
curl -X POST http://localhost:3001/api/parent-alerts/digest -H "Authorization: Bearer <admin-token>"

# Alert API
curl http://localhost:3001/api/parent-monitor/alerts -H "Authorization: Bearer <parent-token>"

# Alert file check
cat backend/data/parent-alerts-{parentId}.json | python3 -m json.tool | grep '"type"'

# Server digest email
ssh vectorserver 'grep -i "parent.*alert\|digest" /home/nathan/.pm2/logs/backend-out-1.log | tail -5'
```

### Final Checklist
- [ ] All 4 signal computations implemented and returning correct values
- [ ] Daily digest timer fires independently (not in queue processor)
- [ ] One email per parent (all students batched), via Brevo SMTP
- [ ] In-app alerts show badge + banner in parent dashboard
- [ ] Alerts auto-resolve when student corrects behavior
- [ ] All new files use TypeScript strict mode
- [ ] Deployed to server and verified via curl

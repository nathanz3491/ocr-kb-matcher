# Architecture

> System design overview for the OCR Knowledge Base Matcher platform.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│  Next.js 16 (React 19, Tailwind CSS v4, shadcn/ui)         │
│  Port 3000 (dev) / static export (prod)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (REST API + JWT Bearer)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express Backend                          │
│  Port 3001                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │
│  │  Routes   │  │Middleware │  │      Services          │   │
│  │ 24 groups │  │ auth      │  │ 37 service files       │   │
│  │           │  │ quota     │  │ jobProcessor (803 loc) │   │
│  │           │  │ rateLimit │  │ ai.ts (Moonshot)       │   │
│  │           │  │ error     │  │ ocr.ts (Tesseract.js)  │   │
│  │           │  │ audit     │  │ quizService.ts         │   │
│  │           │  │ upload    │  │ reviewService.ts (SM-2)│   │
│  └───────────┘  └───────────┘  └───────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Data Layer                          │   │
│  │  SQLite (better-sqlite3, WAL mode) ← migrated JSON    │   │
│  │  13 tables: users, jobs, graph_nodes, graph_edges,    │   │
│  │  flashcard_sets, flashcards, reviews, quiz_sessions,   │   │
│  │  quiz_results, chat_sessions, subscriptions,           │   │
│  │  webhook_events, audit_log, trial_attempts            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 External Services                      │   │
│  │  Moonshot AI (OpenAI-compatible)                       │   │
│  │  Sentry (error monitoring)                             │   │
│  │  Resend (email)                                        │   │
│  │  Tesseract.js (OCR, local)                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | Next.js | 16.2.1 | App Router, SSR/SSG |
| UI Library | React | 19 | Component rendering |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| UI Components | shadcn/ui | base-nova | Accessible primitives |
| Icons | Lucide React | Latest | SVG icons |
| Flow Visualization | @xyflow/react | v12 | Knowledge graph visualization |
| Backend Framework | Express | 4.x | HTTP server + routing |
| Runtime | Node.js | 20+ | JavaScript runtime |
| Language | TypeScript | 5.x | Type safety |
| Database | better-sqlite3 | 12.x | Embedded SQL database |
| OCR Engine | Tesseract.js | Latest | Browser + Node.js OCR |
| AI Provider | Moonshot AI | OpenAI-compatible | Text matching + generation |
| AI Client | openai (npm) | Latest | OpenAI-compatible SDK |
| Email | Resend | Latest | Transactional email |
| Error Monitoring | @sentry/node | 10.x | Error tracking + alerting |
| Logging | pino | Latest | Structured JSON logging |
| Circuit Breaker | opossum | 10.x | AI API fault tolerance |
| Process Manager | PM2 | Latest | Production process management |

---

## Data Flow: Upload Pipeline

```
User Uploads File
       │
       ▼
┌─────────────────┐
│  1. File Save   │  multer → uploads/ directory
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. OCR Extract  │  Tesseract.js → raw text + confidence scores
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Text Chunk   │  Split into semantic chunks (paragraph/section)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Graph Build  │  Generate nodes from chunks via AI
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. AI Match     │  Match new nodes against existing knowledge graph
└────────┬────────┘       (Moonshot AI with circuit breaker)
         │
         ▼
┌─────────────────┐
│ 6. Enrich       │  Create edges, relationships, categories
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Persist      │  Save nodes + edges to SQLite (graph_nodes, graph_edges)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Job Complete │  Update job status → COMPLETED
└─────────────────┘
```

### Job Status Transitions

```
PENDING → PROCESSING → OCR_COMPLETE → MATCHING → COMPLETED
                │                                    │
                └──────────── FAILED ◄───────────────┘
```

---

## Component Breakdown

### Frontend (Next.js)

| Component | Path | Purpose |
|---|---|---|
| Dashboard | `app/(protected)/` | Main user dashboard with stats |
| UsageWidget | `components/dashboard/` | Quota bar + tier badge |
| Upload | `app/(protected)/upload/` | File upload + job tracking |
| Knowledge Graph | `app/(protected)/knowledge-graph/` | Interactive graph visualization |
| Flashcards | `app/(protected)/flashcards/` | Flashcard review UI |
| Quiz | `app/(protected)/quiz/` | Quiz taking + results |
| Study Materials | `app/(protected)/study/` | Cheat sheets + notes |
| Admin Panel | `app/(protected)/admin/` | User management + tier control |
| Pricing | `app/pricing/` | Public pricing page |
| Legal | `app/legal/` | Terms, privacy, refund |

### Backend (Express)

| Module | Purpose |
|---|---|
| Routes (24 groups) | HTTP endpoint definitions |
| Middleware (auth, quota, rateLimit, error, audit, upload) | Request pipeline |
| Services (37 files) | Business logic (no Express dependency) |
| DB Layer (SQLite) | Data persistence via better-sqlite3 |

---

## Multi-User Model

### Per-User Isolation

All data tables use `user_id` columns for row-level isolation:

```
graph_nodes(user_id, ...)  — user-specific knowledge nodes
graph_edges(user_id, ...)  — user-specific relationships
flashcards(user_id, ...)   — user-specific flashcards
reviews(user_id, ...)      — user-specific review schedules
quiz_sessions(user_id, ...)
chat_sessions(user_id, ...)
```

The special `user_id = '__global__'` stores shared/system data like built-in subject packs.

### Auth Flow

1. User registers → password hashed with bcryptjs → stored in `users` table
2. User logs in → JWT access token issued (signed with `JWT_SECRET`)
3. Every request → `authenticate` middleware extracts `userId` from Bearer token
4. `optionalAuth` on most routes — attaches user if token present, allows guest otherwise
5. `requireAuth` middleware gates protected routes

---

## Subscription Tier Enforcement Flow

```
Request arrives
      │
      ▼
authenticate middleware → req.user populated
      │
      ▼
enforceQuota('uploads') middleware
      │
      ├─ Read user from DB (getUserById)
      ├─ Lazy tier downgrade (if subscriptionExpiresAt < now → downgrade to free)
      ├─ Period rollover check (isCurrentPeriod)
      │   ├─ Free: calendar month (resets 1st of UTC month)
      │   ├─ Monthly: 31 days from periodStart
      │   └─ Yearly: 365 days from periodStart
      ├─ Check: used < limit ?
      │   ├─ YES → increment counter, save, continue
      │   └─ NO  → 429 + QUOTA_EXCEEDED + resetsAt
```

### Tier Limits (`tiers.ts`)

| Resource | Free | Monthly | Yearly |
|---|---|---|---|
| Uploads | 2 | 15 | 15 |
| Quiz Generated | 3 | 30 | 30 |
| Chat Messages | 20 | 100 | 100 |
| Max File Size | 20 MB | 100 MB | 100 MB |

---

## Job Queue Architecture

```
┌─────────────────────────────────────────────┐
│           queueProcessor.ts                  │
│                                              │
│  On boot: checkStaleJobs()                   │
│    → reclaimStaleJobs()                      │
│    → Reset stuck PROCESSING → PENDING        │
│                                              │
│  Polling loop (every 5s):                    │
│    → claimJob('queue-processor-{pid}')       │
│    → UPDATE ... RETURNING * (atomic claim)   │
│    → JobProcessor.processJob(jobId)          │
│    → Emit events:                             │
│       job:started, job:completed,            │
│       job:failed, job:timeout                │
│                                              │
│  Graceful shutdown:                          │
│    SIGTERM → stop polling → force-exit 10s   │
└─────────────────────────────────────────────┘
```

### Atomic Job Claiming (Task 3)

```sql
UPDATE jobs
SET status = 'processing',
    claimed_by = ?,
    claimed_at = datetime('now'),
    attempts = attempts + 1
WHERE id = ?
  AND status = 'pending'
RETURNING *
```

Single-statement atomic claim eliminates the TOCTOU race present in the old read-then-write JSON pattern. Concurrent claimers: exactly 1 succeeds, others return `null`.

---

## External Dependencies

| Service | Purpose | Failure Mode |
|---|---|---|
| Moonshot AI | Text matching, quiz generation, flashcard creation | Circuit breaker (opossum) — opens at 50% error rate, 30s reset |
| Sentry | Error tracking + alerting | Conditional init (only when `SENTRY_DSN` set), failures logged to pino |
| Resend | Email verification | Non-blocking; failures logged |
| Tesseract.js | OCR text extraction | Runs locally, no external call |
| UptimeRobot | Health monitoring | External service, no code dependency |

---

**Last updated:** 2026-07-12

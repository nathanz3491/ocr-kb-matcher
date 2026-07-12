# Development Guide

> Setup, conventions, and common tasks for developers working on the OCR Knowledge Base Matcher.

---

## Prerequisites

- **Node.js** 20+ (recommended: latest LTS)
- **npm** 9+
- **Git**

---

## Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/nathanz3491/ocr-kb-matcher.git
cd ocr-kb-matcher
npm install
```

### 2. Configure Backend Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:

| Variable | Required | Description |
|---|---|---|
| `MOONSHOT_API_KEY` | Yes | Moonshot AI API key (format: `sk-...`) |
| `MOONSHOT_BASE_URL` | Yes | Moonshot API base URL |
| `MOONSHOT_MODEL` | Yes | Model name (e.g., `moonshot-v1-8k`) |
| `JWT_SECRET` | Yes | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Yes | Generate similarly |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `RESEND_API_KEY` | Optional | For email verification |
| `EMAIL_FROM_NAME` | Optional | Sender name for emails |
| `EMAIL_FROM` | Optional | Sender email address |
| `SENTRY_DSN` | Optional | Sentry DSN for error monitoring (leave empty for local dev) |
| `LOG_LEVEL` | Optional | Log level: `debug`, `info`, `warn`, `error` (default: `info`) |
| `QUEUE_POLL_INTERVAL_MS` | Optional | Job queue polling interval in ms (default: `5000`) |
| `TRUST_PROXY` | Optional | Set to `1` when behind Cloudflare/reverse proxy |
| `ADMIN_EMAILS` | Optional | Comma-separated admin emails for env-based admin assignment |
| `MAX_UPLOAD_SIZE_MB` | Optional | Absolute server max file size in MB (default: `50`) |

> Neo4j env vars (`NEO4J_URI`, `NEO4J_PASSWORD`) exist in `.env.example` but are **unused**. The codebase uses SQLite via `better-sqlite3`.

### 3. Configure Frontend Environment

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## Running the Application

### Development (both services)

```bash
npm run dev
```

This starts both frontend (port 3000) and backend (port 3001) via `concurrently`.

### Frontend Only

```bash
cd frontend
npm run dev          # next dev --webpack
npm run dev:turbopack  # next dev --turbopack (faster HMR)
```

### Backend Only

```bash
cd backend
npm run dev          # nodemon + ts-node (hot reload)
```

### Verify

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

---

## Codebase Tour

```
ocr-kb-matcher/
├── frontend/               # Next.js 16 App Router, React 19
│   ├── app/               # Pages (App Router)
│   │   ├── (protected)/   # Authenticated routes
│   │   ├── pricing/       # Public pricing page
│   │   └── legal/         # Terms, privacy, refund
│   ├── components/        # React components
│   │   ├── ui/            # shadcn/ui primitives
│   │   ├── dashboard/     # UsageWidget, stats
│   │   ├── upload/        # File upload UI
│   │   └── notification/  # QuotaExceededHandler
│   ├── contexts/          # AuthContext
│   ├── hooks/             # useJobStatus, useUpload
│   └── lib/               # api.ts (fetch), auth.ts (axios), utils.ts (cn)
├── backend/               # Express + TypeScript
│   ├── src/
│   │   ├── index.ts       # Entry point: DB init → stale recovery → queue polling
│   │   ├── app.ts         # Express factory (helmet, CORS, rate limit, middleware chain)
│   │   ├── routes/        # 24 route groups mounted at /api/*
│   │   ├── services/      # 37 service files (business logic)
│   │   ├── middleware/     # auth, quota, rateLimit, error, audit, upload, validate
│   │   ├── config/        # tiers.ts (quota limits, period helpers)
│   │   ├── types/         # Local TS types
│   │   ├── prompts/       # AI prompt templates
│   │   ├── lib/           # logger (pino), circuitBreaker (opossum)
│   │   └── db/            # sqlite.ts (DB connection + schema init)
│   ├── scripts/           # backup-db.ps1/sh, migrate-json-to-sqlite.ts
│   └── data/              # Legacy JSON files (preserved as backup)
├── shared/                # Cross-package TypeScript types
│   └── types.ts           # Job, GraphNode, Tier, Usage, ProcessingStatus, etc.
└── package.json           # npm workspaces root
```

---

## Code Style

### TypeScript

- Strict mode enabled in `tsconfig.json`
- No `any` casts, no `@ts-ignore` (use `as unknown as` pattern if unavoidable)
- Import shared types from `shared/types.ts`: `import { Tier } from '../../../shared/types'`

### Backend Conventions

- **Every route handler wrapped in `asyncHandler`** — unhandled async errors crash Express
- **Express concern stays in routes** — services must remain transport-agnostic
- **AI calls use `matchWithRetry()`** from `ai.ts` (exponential backoff, 120s timeout)
- **Don't assume Neo4j** — all storage goes through `knowledgeGraphStorage.ts` (now SQLite-backed)
- **JWT tokens**: Sign via `jwtService.sign()`, verify via `jwtService.verify()`
- **Custom errors**: `throw new AppError(message, statusCode)`
- **Logging**: Use `logger.info/warn/error` (pino structured logs), never `console.log`

### Frontend Conventions

- **Dark mode**: Every component checks `useTheme().theme` (`'light' | 'dark'`)
- **Never bare `bg-white` or `text-slate-700`** without dark mode alternative
- **Use `bg-slate-*`** consistently (never `bg-gray-*`)
- **Conditional classes**: Use `cn()` from `lib/utils.ts` (clsx wrapper)
- **Icons**: Lucide React, individual imports only (`import { Mail } from 'lucide-react'`)
- **API calls**: `lib/api.ts` for raw fetch, `lib/auth.ts` for axios with 401 interceptor
- **Path alias**: `@/*` → `./frontend/*`

---

## Testing

### Running Tests

```bash
cd backend
npm test              # Run all Jest tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test Structure

Tests use Jest with `ts-jest` and in-memory SQLite databases.

| Test File | Coverage |
|---|---|
| `middleware/quota.test.ts` | Quota enforcement, lazy downgrade, period rollover, 429 responses |
| `middleware/auth.test.ts` | JWT validation, admin checks, dev fallback, revoked tokens |
| `routes/admin.test.ts` | Tier PATCH, role update, user listing, stats, audit log |
| `services/userService.test.ts` | CRUD, setUserTier, password hashing |

### TypeScript Check

```bash
cd backend && npx tsc --noEmit   # Backend type check
cd frontend && npx tsc --noEmit  # Frontend type check (build ignores TS errors!)
```

### Lint

```bash
cd frontend && npm run lint
```

---

## Common Tasks

### Add a New API Endpoint

1. Create or edit a route file in `backend/src/routes/`
2. Always wrap handler in `asyncHandler`
3. Register the route in `routes/index.ts` via `router.use('/api/...', routes)`
4. If it needs quota enforcement, add `enforceQuota('resourceType')` middleware
5. Add the endpoint to `docs/API.md`

### Add a New Service

1. Create file in `backend/src/services/`
2. Export a class or singleton
3. Do NOT import Express types — keep transport-agnostic
4. Use `getDb()` from `db/sqlite.ts` for data access

### Add a New Frontend Page

1. Create directory under `frontend/app/` (or `(protected)/` for auth-required pages)
2. Use existing layout patterns (gradient bg, glass cards, dark mode)
3. Use `useTheme()` for dark mode, `cn()` for conditional classes

### Add a New Tier

1. Add to `Tier` type in `shared/types.ts`
2. Add limits to `TIER_LIMITS` in `backend/src/config/tiers.ts`
3. Update period logic in `nextAnniversaryDate()` if needed
4. Update docs in `docs/PRICING.md`

### Add a Subject Pack

1. Create the knowledge graph nodes (manually or via AI batch generation)
2. Store in the `__global__` user graph
3. Register in `subjectService.ts`
4. Add to frontend subject selector UI

---

## Anti-Patterns

> See root `AGENTS.md` for the full list. Key highlights:

- **Don't call AI directly** — use `matchWithRetry()` with exponential backoff
- **Don't assume Neo4j is active** — all storage is SQLite via `better-sqlite3`
- **Don't add routes without `asyncHandler`** — unhandled async errors crash Express
- **Don't mount routes at root** — all go through `routes/index.ts`
- **Don't use `console.log`** — use pino `logger.info/warn/error`
- **Don't suppress type errors** with `as any` or `@ts-ignore`
- **Don't hardcode colors in frontend** without dark mode alternative

---

**Last updated:** 2026-07-12

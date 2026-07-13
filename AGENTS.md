# OCR Knowledge Base Matcher — Agent Reference

This file is the canonical reference for all agents working in this repository. Read it before starting any task.

> Sub-folder AGENTS.md files contain deeper, area-specific guidance and override this file when they conflict:
> - `frontend/AGENTS.md` — Next.js styling system, theme, component patterns
> - `backend/src/routes/AGENTS.md` — 26 Express route groups
> - `backend/src/services/AGENTS.md` — 37 service files (business logic)

---

## Repository

- **Local workspace:** `C:\Users\64887\ocr-kb-matcher`
- **GitHub:** https://github.com/nathanz3491/ocr-kb-matcher (private)
- **Stack:** TypeScript, Next.js 16.2.1 (frontend, App Router, React 19), Express (backend), Tesseract.js OCR, OpenAI-compatible Moonshot AI, React Flow (`@xyflow/react` v12), Resend email, `@base-ui/react`, PWA (prod only)

---

## Local vs Server Instance

This repo has **two deployment targets** — a local dev instance and a remote server instance.

### Local Instance (default — what you work with)

- **Frontend:** `http://localhost:3000` (Next.js dev server)
- **Backend:** `http://localhost:3001` (Express, JSON file storage)
- **Start both:** `npm run dev` from root (runs `concurrently`)
- **Backend only:** `cd backend && npm run dev` (nodemon + ts-node)
- **Frontend only:** `cd frontend && npm run dev` (next dev --webpack)
- **Health:** `http://localhost:3001/health` — returns `{ status, timestamp, service, version, environment }`

**Required env:**
- `backend/.env` (copy from `backend/.env.example`):
  - `MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL`, `MOONSHOT_MODEL` — required for AI
  - `CORS_ORIGIN` — comma-separated allowed origins (default `http://localhost:3000`)
  - `JWT_SECRET`, `JWT_REFRESH_SECRET` — generate via `crypto.randomBytes(64).toString('hex')`
  - `RESEND_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM` — for email verification
  - Optional: `LOG_LEVEL`, `QUEUE_POLL_INTERVAL_MS`, `TRUST_PROXY=1` (behind Cloudflare/reverse proxy)
  - **Neo4j vars exist in `.env.example` but are unused** — JSON file storage is active
- `frontend/.env.local`:
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` (or production URL)
  - Do NOT put backend-only vars here

### Server Instance (remote deployment)

| Server | Host | Port | User | SSH Key |
|---|---|---|---|---|
| `vectorserver` | `139.199.220.244` | `6000` | `nathan` | `~/.ssh/id_ed25519` |

- **Remote path:** `/home/nathan/ocr-kb-matcher`
- **Connect:** `ssh vectorserver` (or `ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -p 6000 nathan@139.199.220.244`)
- **Deploy workflow:** Develop locally → SCP/rsync → verify on server → reload PM2

**Server deployment:** PM2 via `ecosystem.config.js` runs 3 processes: `proxy` (`standalone-proxy.js`), `backend` (port 3001), `frontend` (port 3000, via `next start`). Backend `CORS_ORIGIN` on server includes `http://61.141.248.185:8181` and active `*.trycloudflare.com` tunnels.

> Load both `frontend-design` and `ssh-connection` skills when doing frontend work on the server instance.

---

## Project Structure

```
ocr-kb-matcher/
├── frontend/               # Next.js 16.2.1 App Router, React 19, Tailwind v4, shadcn/ui (base-nova)
│   ├── app/               # Pages including (protected)/ route group
│   ├── components/       # ui/, upload/, results/, analytics/, quiz/, auth/, navigation/, theme/, gamification/
│   ├── contexts/          # AuthContext.tsx
│   ├── hooks/             # useJobStatus.ts, useUpload.ts
│   ├── lib/               # api.ts (fetch + Bearer auth), auth.ts (axios interceptors), utils.ts (cn())
│   └── .env.local         # NEXT_PUBLIC_API_BASE_URL
├── backend/               # Express + TypeScript
│   ├── src/
│   │   ├── index.ts       # Entry point — KG storage init → stale job recovery → queue polling
│   │   ├── app.ts         # Express factory (helmet, CORS, body 10mb, rate limit 300/min, optionalAuth, audit)
│   │   ├── routes/        # 24 route groups mounted via router.use('/api/...') in routes/index.ts
│   │   ├── services/      # 37 service files — core business logic (no Express here)
│   │   ├── middleware/    # errorHandler (asyncHandler + AppError), auth, logger, rateLimit, auditLog, upload, validate
│   │   ├── types/         # Local TS types (ai.ts, auth.ts, ocr.ts)
│   │   ├── prompts/       # AI prompt templates (matching.ts)
│   │   └── tests/         # 3 backend test files (see Known Issues)
│   ├── data/              # JSON persistence (knowledge-graph.json, users.json, etc.)
│   ├── uploads/           # User-uploaded files
│   └── dist/              # Compiled JS output
├── shared/
│   └── types.ts           # Shared TS types (Job, GraphNode, ProcessingStatus, MatchResult, Flashcard, etc.)
├── package.json           # npm workspaces (frontend + backend); runs both concurrently
└── ecosystem.config.js    # PM2 config for server (proxy + backend + frontend)
```

### Key Backend Services (`backend/src/services/`)

| Service | File | Purpose |
|---|---|---|
| Pipeline | `jobProcessor.ts` | OCR → chunk → AI match → enrich (~803 lines, largest) |
| AI | `ai.ts` | Moonshot API via OpenAI client, retry + exponential backoff, 120s timeout |
| KB Matching | `aiKnowledgeMatching.ts` | Match content against knowledge nodes |
| Graph | `knowledgeGraph.ts` | Graph CRUD + traversal |
| Graph Storage | `knowledgeGraphStorage.ts` | **JSON file persistence (not Neo4j)** |
| OCR | `ocr.ts` | Tesseract.js pipeline, path sanitization, magic byte validation, optional ImageMagick |
| Quiz | `quizService.ts` | Adaptive quiz generation + scoring |
| Review | `reviewService.ts` | SM-2 spaced repetition algorithm |
| Queue | `queueProcessor.ts` | Async job queue with polling (default 5s), stale job recovery |

> Full service table in `backend/src/services/AGENTS.md`.

### Backend Startup Sequence (`backend/src/index.ts`)

1. `app.listen(PORT)` — defaults to 3001
2. `getKnowledgeGraphStorage().initialize()` — load JSON files
3. `queueProcessor.checkStaleJobs()` — reset jobs orphaned by previous crash
4. `queueProcessor.startPolling()` — every `QUEUE_POLL_INTERVAL_MS` (default 5000)
5. Attach event listeners: `job:started`, `job:completed`, `job:failed`, `job:timeout`
6. SIGTERM/SIGINT → graceful shutdown (stop polling, force-exit after 10s)

---

## Commands

### Root

```bash
npm run dev              # Both frontend + backend via concurrently
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only
npm run build            # Frontend next build → backend tsc → dist/
```

### Frontend (`cd frontend`)

```bash
npm run dev              # next dev --webpack
npm run dev:turbopack    # next dev --turbopack (faster HMR)
npm run lint             # eslint (flat-config, next/core-web-vitals + typescript)
npm run build            # next build --webpack (typescript errors IGNORED — see Known Issues)
```

### Backend (`cd backend`)

```bash
npm run dev    # nodemon + ts-node (hot reload on src/)
npm run build  # tsc → dist/
npm run start  # node dist/index.js
```

> No backend lint or test commands are wired to `npm run`. Tests live in `backend/src/tests/` but require manual invocation.

---

## Conventions

### Backend Routes

- Every handler wrapped in `asyncHandler` from `middleware/errorHandler.ts` — unhandled async errors crash Express
- Route files export a default `Router`; mounted in `routes/index.ts` via `router.use('/api/<name>', routes)`
- Dev-only routes (`test.ts`, `/test-error`, `/test-async-error`) guarded by `NODE_ENV !== 'production'`
- Custom errors: `new AppError(message, statusCode)` → caught by global `errorHandler`
- **No DB transactions** — JSON file writes are not atomic
- Auth: `optionalAuth` middleware (JWT, `jwtService`) — attaches `req.userId` if token present, but allows guest access on most routes
- Standard CORS response: allow-listed origin OR `*.trycloudflare.com` regex match
- Rate limit: 300 req/min per IP (skips `/health`) via `generalLimiter`

### Frontend

- **API calls:** `lib/api.ts` (raw `fetch`, Bearer-token auth) — but **`lib/auth.ts` uses axios interceptors** for global 401 → redirect-to-login
- **Dark mode:** Every component checks `useTheme().theme` (`'light' | 'dark'`) — see `frontend/AGENTS.md` for exact tokens
- **Styling:** Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.*`); shadcn style is `base-nova` per `components.json`
- **Icons:** Lucide React — individual imports only (`import { Mail, Loader2 } from 'lucide-react'`), never barrel
- **Conditional classes:** Always use `clsx()` or `cn()` from `lib/utils.ts`
- **Path aliases:** `@/*` → `./frontend/*`, `@shared/*` → `../shared/*` (configured in both `tsconfig.json`)

### Shared Types

- `shared/types.ts` contains cross-package types: `Job`, `GraphNode`, `GraphEdge`, `MatchResult`, `ProcessingStatus`, `JobType`, `ParsedQuestion`, `KnowledgeBaseEntry`, `OCRTextSpan`, `Flashcard`, `CheatSheet`, `StudyNotes`, `ApiResponse<T>`
- Both `frontend/tsconfig.json` and `backend/tsconfig.json` include `../shared/**/*`
- Import as `import { Job } from '../../../shared/types'` (backend) or `import { Job } from '@shared/types'` (frontend)

---

## Anti-Patterns

### Backend (`backend/src/`)

- **Don't call AI directly** — use `matchWithRetry()` with exponential backoff from `ai.ts` (or `getMoonshotConfig()` + `createOpenAIClient()` for custom flows)
- **Don't assume Neo4j is active** — always use `knowledgeGraphStorage.ts` JSON persistence; Neo4j env vars are vestigial
- **Don't add routes without `asyncHandler`** — unhandled async errors crash Express
- **Don't mount routes at root** — all go through `routes/index.ts` via `router.use('/api/...')`
- **Don't do DB transactions** — JSON writes are not atomic; protect with retries if needed
- **Don't block on AI calls** — always await with timeout (default 120s)
- **Don't suppress type errors** with `as any` or `@ts-ignore`

### Frontend (`frontend/`)

- **Never hardcode colors** without `theme === 'dark'` check
- **Never use bare `bg-white`** or `text-slate-700` without dark mode alternative
- **Never use `bg-gray-*`** — use `bg-slate-*` consistently
- **Never skip `clsx()`/`cn()`** for conditional classes
- **Always use Lucide React** icons (individual imports only, no barrel)
- **Never ignore dark mode** — auth pages use a specific gradient + decorative orbs layout (see `frontend/AGENTS.md`)
- See `frontend/AGENTS.md` for the exact `bg-gradient`, glass-card, button, input, and error-state class recipes — these are the project standard

---

## Known Issues

- **README.md has merge conflicts** — contains unresolved `<<<<<<< HEAD` / `=======` / `>>>>>>> c2c7a0f` markers. Do not trust README as source of truth — verify with actual config files.
- **`@anthropic-ai/sdk` is a dead dependency** — listed in `backend/package.json` but **zero usages** in `backend/src/`. The AI service uses `openai` (OpenAI-compatible client) targeting Moonshot.
- **`@playwright/test` is a dead dependency** — listed in root `package.json` but **no Playwright tests exist** anywhere in the repo.
- **`pdf-parse` and `pdfjs-dist` are dead root deps** — listed in root `package.json` deps but actual PDF handling is in `backend/` (mammoth for DOCX, tesseract.js for OCR, pdfkit for export). Likely vestigial.
- **Frontend TypeScript errors ignored at build time** — `next.config.ts` has `typescript.ignoreBuildErrors: true`. Run `cd frontend && npx tsc --noEmit` manually to catch type errors.
- **No CI workflows** — `.github/` contains only screenshots. No TypeScript check, no lint check, no tests in CI.
- **No backend lint/test commands in `package.json`** — backend tests exist in `backend/src/tests/` (`ocr.test.ts`, `batchMatching.test.ts`, `questionParser.test.ts`) but must be invoked manually (e.g. via `ts-node` or a test runner you wire up).
- **Frontend `frontend/` has nested `.claude/`** — internal git repo, ignored by Multica bare clone (`ocr-kb-matcher-github/` is the bare clone target).
- **`ecosystem.config.js` is hardcoded to server paths** (`/home/nathan/ocr-kb-matcher`) — do not run locally; only for the `vectorserver` PM2 deploy.
- **JSON storage is not concurrency-safe** — multiple simultaneous writes to the same file can corrupt data. Single-process backend assumed.
- **Sisyphus state in `.sisyphus/`** — `boulder.json` tracks continuation state; `plans/`, `notepads/`, `evidence/` are Sisyphus artifacts. Don't commit unless asked.

---

## Verification Checklist (per task)

1. `cd backend && npx tsc --noEmit` — backend type check
2. `cd frontend && npx tsc --noEmit` — frontend type check (build ignores them)
3. `cd frontend && npm run lint` — ESLint
4. `cd backend && npm run build && npm start` — verify production build boots
5. Manual API smoke: `curl http://localhost:3001/health` returns `status: ok`
6. `git status` / `git diff` — review all changes before any commit (never commit unless explicitly requested)
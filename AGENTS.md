# OCR Knowledge Base Matcher — Agent Reference

This file is the canonical reference for all agents working in this repository.

---

## Repository

- **Local workspace:** `C:\Users\64887\ocr-kb-matcher`
- **GitHub:** https://github.com/nathanz3491/ocr-kb-matcher (private)
- **Stack:** TypeScript, Next.js 16.2.1 (frontend), Express (backend), Tesseract.js OCR, Moonshot AI, React Flow (`@xyflow/react` v12), Resend email, `@base-ui/react`, PWA (prod only)

---

## Local vs Server Instance

This repo has **two deployment targets** — a local dev instance and a remote server instance.

### Local Instance (default — what you work with)

- **Frontend:** `http://localhost:3000` (Next.js 16, React 19, Tailwind CSS 4)
- **Backend:** `http://localhost:3001` (Express, TypeScript, JSON file storage)
- **Start both:** `npm run dev` from root, or use `start.bat` (kills existing ports first)
- **Backend only:** `cd backend && npm run dev`
- **Frontend only:** `cd frontend && npm run dev`
- **Required env:**
  - `backend/.env` — `MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL`, `MOONSHOT_MODEL` (required); `CORS_ORIGIN` (comma-separated); `LOG_LEVEL`; `QUEUE_POLL_INTERVAL_MS`. Copy from `backend/.env.example`. Neo4j vars exist in `.env.example` but are unused (JSON file storage is active).
  - `frontend/.env.local` — `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` (required). Do NOT put backend-only vars here.

### Server Instance (remote deployment)

| Server | Host | Port | User | SSH Key |
|---|---|---|---|---|
| `vectorserver` | `139.199.220.244` | `6000` | `nathan` | `~/.ssh/id_ed25519` |

**Remote dev path:** `/home/nathan/` (or `/home/nathan/projects/`)

**Connect:**
```bash
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -p 6000 nathan@139.199.220.244
# or
ssh vectorserver
```

**SCP file to server:**
```bash
scp -i ~/.ssh/id_ed25519 -P 6000 local_file.txt nathan@139.199.220.244:/home/nathan/
```

**Deploy workflow:** Develop locally → SCP/rsync to server → verify on server.

**Server deployment:** PM2 via `ecosystem.config.js` — starts 3 processes: `proxy` (Node.js), `backend` (port 3001), `frontend` (port 3000). Remote CORS origin: `http://61.141.248.185:8181`.

> Load both `frontend-design` and `ssh-connection` skills when doing frontend work on the server instance.

---

## Project Structure

```
ocr-kb-matcher/
├── frontend/               # Next.js 16.2.1 App Router, React 19, Tailwind v4, shadcn/ui, @xyflow/react
│   ├── app/               # Pages (dashboard/, knowledge-graph/, quiz/, graph-editor/, etc.)
│   ├── components/       # UI, upload/, results/, analytics/, quiz/, auth/, navigation/, theme/, email/, gamification/
│   ├── contexts/          # AuthContext.tsx
│   ├── hooks/             # useJobStatus.ts, useUpload.ts
│   ├── lib/               # api.ts (fetch + auth), auth.ts, utils.ts
│   └── .env.local         # NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
├── backend/               # Express + TypeScript
│   ├── src/
│   │   ├── index.ts       # Entry point — KG storage init → stale job recovery → queue polling
│   │   ├── app.ts         # Express app factory
│   │   ├── routes/        # 26 route groups mounted under /api/* via routes/index.ts
│   │   ├── services/      # 30+ service files — core business logic
│   │   ├── middleware/     # errorHandler.ts (asyncHandler wrapper + AppError class)
│   │   ├── types/         # Local TypeScript types
│   │   └── prompts/       # AI prompt templates
│   └── dist/              # Compiled JS output
├── shared/
│   └── types.ts           # Shared TypeScript types
└── package.json           # npm workspaces — runs both concurrently
```

### Key Backend Services (`backend/src/services/`)

| Service | File | Purpose |
|---|---|---|
| Pipeline | `jobProcessor.ts` | Full doc pipeline: OCR → chunk → AI match → enrich |
| AI | `ai.ts` | Moonshot API via OpenAI-compatible client, retry + exponential backoff, 120s timeout |
| KB Matching | `aiKnowledgeMatching.ts` | Match content against knowledge nodes |
| Graph | `knowledgeGraph.ts` | Graph CRUD + traversal |
| Graph Storage | `knowledgeGraphStorage.ts` | JSON file persistence (not Neo4j) |
| OCR | `ocr.ts` | Tesseract.js pipeline, path sanitization |
| Quiz | `quizService.ts` | Adaptive quiz generation + scoring |
| Review | `reviewService.ts` | SM-2 spaced repetition algorithm |
| Queue | `queueProcessor.ts` | Async job queue with polling, stale job recovery |

> **Storage:** **JSON flat-file persistence** by default. Neo4j vars in `.env` are unused.

### Backend Startup Sequence (`backend/src/index.ts`)

1. Server listens on PORT
2. Initialize knowledge graph storage (`getKnowledgeGraphStorage().initialize()`)
3. Check for stale jobs from previous crash (`queueProcessor.checkStaleJobs()`)
4. Start queue polling (default: every 5s, configurable via `QUEUE_POLL_INTERVAL_MS`)
5. Attach event listeners: `job:started`, `job:completed`, `job:failed`, `job:timeout`
6. Graceful shutdown on SIGTERM/SIGINT — stops polling, waits 10s max

---

## Commands

### Local Dev

```bash
npm run dev              # Both frontend + backend (concurrently)
npm run dev:frontend     # Frontend only (http://localhost:3000)
npm run dev:backend      # Backend only (http://localhost:3001)
npm run build            # Build both (frontend next build → backend tsc)
```

### Frontend Scripts (`cd frontend`)

```bash
npm run dev              # next dev --webpack
npm run dev:turbopack    # next dev --turbopack (faster HMR)
npm run lint             # eslint flat-config, next/core-web-vitals
npm run build            # next build --webpack
```

### Backend Scripts (`cd backend`)

```bash
npm run dev    # nodemon + ts-node (hot reload)
npm run build  # tsc → dist/
npm run start  # node dist/index.js
```

---

## Conventions

### Backend Routes

- All routes use `asyncHandler` wrapper from `middleware/errorHandler.ts`
- Route files export a default `Router`; mounted in `routes/index.ts` under `/api/*`
- Dev-only routes (`/api/test`) guarded by `NODE_ENV !== 'production'`
- Custom errors: `new AppError(message, statusCode)` → caught by global error handler
- No DB transactions — JSON file writes are not atomic
- Auth: `optionalAuth` middleware (JWT) — attaches `userId` if token present, but allows guest access on most routes

### Frontend

- **API calls:** `lib/api.ts` — raw `fetch`, auth-aware (Bearer token), uses `NEXT_PUBLIC_API_BASE_URL`
- **Dark mode:** Every component must check `useTheme().theme` (`'light' | 'dark'`)
- **Styling:** Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.*`)
- **Icons:** Lucide React — individual imports only, never barrel
- **Classes:** Always use `clsx()`/`cn()` for conditional classes
- **Colors:** Use `bg-slate-*` (never `bg-gray-*`); dark mode alternatives always required

---

## Anti-Patterns

### Backend (`backend/src/`)

- **Don't call AI directly** — use `matchWithRetry()` with exponential backoff from `ai.ts`
- **Don't assume Neo4j is active** — always use `knowledgeGraphStorage.ts` JSON persistence
- **Don't add routes without `asyncHandler`** — unhandled async errors crash Express
- **Don't mount routes at root** — all go through `routes/index.ts`
- **Don't do DB transactions** — JSON writes are not atomic

### Frontend (`frontend/`)

- **Never hardcode colors** without `theme === 'dark'` check
- **Never use bare `bg-white`** or `text-slate-700` without dark mode alternative
- **Never use `bg-gray-*`** — use `bg-slate-*` consistently
- **Never skip `clsx()`/`cn()`** for conditional classes — always use it
- **Always use Lucide React** icons (individual imports only, no barrel)

---

## Known Issues

- **README.md has merge conflicts** — contains unresolved `<<<<<<< HEAD` / `=======` / `>>>>>>> c2c7a0f` markers. Do not trust README as source of truth — verify with actual config files.
- **Frontend `frontend/` has nested `.claude/`** — internal git repo, ignored by Multica bare clone.
- **No CI workflows** — `.github/` contains only screenshots. No TypeScript check, no lint check, no tests in CI.
- **Playwright installed but unused** — `@playwright/test` at root but no test files exist.
- **Frontend TypeScript errors ignored at build time** — `next.config.ts` has `typescript.ignoreBuildErrors: true`. Run `tsc --noEmit` manually to catch type errors.
- **`axios` dead dependency** — listed in `frontend/package.json` deps but `lib/api.ts` uses native `fetch`.
- **`ecosystem.server.json` references `unified-server.js`** — a server entry not present in the local codebase.

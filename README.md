# OCR Knowledge Base Matcher

<p align="center">
  <strong>AI-powered education platform</strong> — extract structured knowledge from documents, build knowledge graphs, and generate adaptive study materials with spaced repetition.<br>
  <sub>OCR &rarr; Knowledge Graph &rarr; Flashcards &middot; Quizzes &middot; Cheat Sheets &middot; SM-2 Review</sub>
</p>

<p align="center">
  <img src=".github/screenshot.png" alt="Knowledge Graph Visualization" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  &nbsp;
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js">
  &nbsp;
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express">
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT">
</p>

---

## What It Does

| Stage | Description |
|---|---|
| **Extract** | Upload PDF, images, or DOCX. Tesseract.js OCR extracts text; Moonshot AI chunks and structures it. |
| **Graph** | Content becomes nodes in a knowledge graph. Create relationships, categories, hierarchies. |
| **Match** | Upload new documents. AI matches content against the graph — finds gaps, overlaps, connections. |
| **Study** | Generate flashcards, cheat sheets, and study notes from any topic. |
| **Quiz** | Adaptive quizzes. Wrong answers feed the SM-2 spaced repetition review queue. |
| **Track** | Mastery levels per topic, study streaks, analytics. |

---

## Use Cases & Features

For a detailed breakdown of what this platform solves, how it works in practice, and a walkthrough of every feature — see [**USE_CASES.md**](USE_CASES.md).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Add your MOONSHOT_API_KEY to backend/.env

# 3. Start
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| Health | http://localhost:3001/health |

---

## Architecture

<p align="center">
  <img src=".github/screenshot-arch.png" alt="Architecture" width="100%">
</p>

### Key Services

| File | Responsibility |
|---|---|
| `jobProcessor.ts` | Document processing pipeline: OCR &rarr; chunk &rarr; AI match &rarr; enrich |
| `knowledgeGraph.ts` | Graph CRUD, traversal, relationship management |
| `knowledgeGraphStorage.ts` | JSON file persistence |
| `aiKnowledgeMatching.ts` | Moonshot AI — match new content against existing nodes |
| `quizService.ts` | Quiz generation, answer scoring, adaptive sessions |
| `reviewService.ts` | SM-2 spaced repetition algorithm |
| `flashcardService.ts` | AI flashcard generation |
| `studyMaterialService.ts` | Cheat sheets and study notes generation |
| `ocr.ts` | Tesseract.js pipeline with path sanitization |
| `queueProcessor.ts` | Async job queue with retry logic |

---

## Project Structure

```
ocr-kb-matcher/
├── frontend/              # Next.js 16, React 19, App Router, Tailwind v4, shadcn/ui, @xyflow/react
│   ├── app/              # Pages (dashboard/, knowledge-graph/, quiz/, graph-editor/, etc.)
│   ├── components/       # UI, upload/, results/, analytics/, quiz/, auth/, navigation/, theme/
│   ├── contexts/          # AuthContext.tsx
│   ├── hooks/             # useJobStatus.ts, useUpload.ts
│   ├── lib/               # api.ts (fetch + auth), auth.ts, utils.ts
│   └── .env.local         # NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
├── backend/               # Express + TypeScript
│   ├── src/
│   │   ├── routes/        # 29 route groups mounted under /api/*
│   │   ├── services/      # 37 service files — core business logic
│   │   ├── middleware/     # errorHandler.ts (asyncHandler wrapper + AppError)
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

## Environment Variables

```env
PORT=3001
MOONSHOT_API_KEY=sk-...       # Required — AI matching and generation
MOONSHOT_BASE_URL=            # Optional — defaults to OpenAI-compatible endpoint
MOONSHOT_MODEL=               # Optional — defaults to moonshot-v1-8k
CORS_ORIGIN=                  # Comma-separated allowed origins
JWT_SECRET=                   # Required — JWT signing secret
JWT_REFRESH_SECRET=           # Required — refresh token secret
QUEUE_POLL_INTERVAL_MS=5000   # Optional — job polling interval
LOG_LEVEL=info                # Optional — debug|info|warn|error
```

---

## API Reference

### Document Processing

```bash
# Upload document
curl -X POST http://localhost:3001/api/upload \
  -F "file=@document.pdf"

# Check job status
curl http://localhost:3001/api/jobs/{jobId}

# List jobs by status
curl "http://localhost:3001/api/jobs?status=processing"
```

### Knowledge Graph

```bash
# List all nodes
curl http://localhost:3001/api/graph/nodes

# Add a node
curl -X POST http://localhost:3001/api/graph/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Spring and Autumn Period",
    "content": "A significant era in Chinese history...",
    "category": "history",
    "keywords": ["Zhou dynasty", "Chinese history"]
  }'

# Create a relationship
curl -X POST http://localhost:3001/api/graph/relationships \
  -H "Content-Type: application/json" \
  -d '{"fromId":"node-0","toId":"node-1","type":"preceded_by"}'
```

### Quizzes & Review

```bash
# Generate quiz from a job
curl -X POST http://localhost:3001/api/quiz/generate/{jobId}

# Submit answers
curl -X POST http://localhost:3001/api/quiz/submit/{sessionId} \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionId":"q1","answer":"B"}]}'

# Get due reviews (SM-2)
curl http://localhost:3001/api/reviews/due

# Analytics overview
curl http://localhost:3001/api/analytics/overview
```

### Study Materials

```bash
# Generate flashcards for a topic node
curl -X POST http://localhost:3001/api/flashcards/generate/{nodeId}

# Generate cheat sheet
curl -X POST http://localhost:3001/api/study/cheat-sheet/{nodeId}

# Generate study notes
curl -X POST http://localhost:3001/api/study/notes/{nodeId}
```

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

## License

MIT

# OCR Knowledge Base Matcher — Agent Reference

This file is the canonical reference for all agents working in this repository.

---

# ⚠️ SACRED: REPORTING RULES — MANDATORY AFTER EVERY TASK

> **THIS SECTION IS SACRED. IGNORING THESE REPORTING RULES IS A CRITICAL FAILURE.**
> After completing ANY task, user request, or application update — regardless of size — you MUST produce a detailed report in your response before finishing.

## Post-Task Report Structure

After every functional change (does NOT include any other tasks), your final response MUST include:

### Files Changed

Provide a table with all files modified or created:

| File | Changed For |
|---|---|
| `frontend/components/SomeComponent.tsx` | Added dark mode toggle, updated gradient button style |
| `backend/services/ai.ts` | Increased retry timeout from 60s to 120s |
| `shared/types.ts` | Added `QuizConfig` type definition |

- Include every file touched — source, config, types, styles, tests, env
- Be specific about what was changed in each file


### New Features / Altered Behaviors

List every new feature, behavior change, or significant logic change in detail:

- **Feature name**: Clear description of what it does
- **Trigger**: How/when it is activated
- **Flow**: Step-by-step data flow or user flow if applicable
- **Edge cases**: What happens at boundaries or error states

If the task is a bug fix, describe what was broken and how it is now fixed.


### Next Steps & Testing

1. **Cloudflare Tunnel URL**: After any server-side change (backend code, env vars, PM2 restart), you MUST:
   - Check if a tunnel is currently running: `ssh ... "ps aux | grep cloudflared"`
   - If running, retrieve the current URL: `ssh ... "cat /home/nathan/cf_tunnel.log | grep trycloudflare"`
   - If not running, start a new tunnel following the Cloudflare Tunnel section above
   - Provide the live URL in this format:
     ```
     🔗 Live URL: https://xxxxxx.trycloudflare.com
     ```
   - Include the URL in EVERY report where the server was redeployed

2. **What to test**: Provide a specific, actionable checklist of things the user should test:
   - "Upload a PDF with mixed Chinese/English text and verify OCR accuracy"
   - "Try the quiz with an incorrect answer and verify SM-2 scheduling updates"
   - "Toggle dark mode and confirm all glass cards render correctly"
   - etc.

3. **Expected behavior**: Provide the specifics of the expected behavior.

4. **Known limitations or caveats**: Any known issues, partial implementations, or things to watch out for.

## Sample Report

```markdown
#REPORT ON PROGRESS LIST UPDATE:

### Files Changed

| File | Changed For |
|---|---|
| `frontend/app/jobs/[id]/page.tsx` | Replaced flat 15-step progress list with collapsible dropdown; added 3 job-type-specific step arrays; `ChevronDown` imported |
| `frontend/lib/utils.ts` | Complete rewrite of `renderMarkdown()` — 5-step safe pipeline |

---

### New Features / Altered Behaviors

- **Processing Progress Dropdown**: Replaces always-visible step list. Folded state shows a single header row with overall progress bar (0–100%), current step label, and a `ChevronDown` toggle. Expanded state reveals each individual step with its own mini bar, icon state (circle / spinner / check), and percentage. Chevron rotates 180° on expand.
- **Job-type-specific step flows**: The expanded list now shows the actual backend pipeline per job type:
  - `WRONG_SINGLE` / `WRONG_MULTIPLE`: claim → validate → ocr → save_ocr → extract_wrong_questions → generate_explanation → generate_practice → save_results → complete
  - `MULTIPLE` / `SINGLE`: claim → validate → ocr → save_ocr → query_kb → match → analyze_knowledge → generate_materials → save_results → complete
- **`renderMarkdown()` fix**: Old pipeline injected `<strong>`, `<mark>` tags before HTML escaping — all tags became literal text (`<strong>`). New 5-step pipeline: (1) escape HTML in raw text, (2) restore escaped markdown delimiters so `**`, `*`, `` ` ``, `|` can be matched as plain text again, (3) apply bold/italic/code transforms, (4) apply `|text|` → `<mark>` highlighter, (5) line breaks.

---

### Next Steps & Testing

1. **Cloudflare Tunnel URL**: 🔗 `https://xxxxxx.trycloudflare.com`

2. **What to test**:
   - Upload a wrong question document → go to job detail → confirm the progress dropdown shows the wrong question flow (8 steps, not the old 15-step standard flow)
   - Expand the dropdown → verify individual step bars animate correctly as processing advances
   - Upload a standard single/multiple document → verify both show the same 9-step "generate_materials" flow
   - On any job page with AI-generated content, verify `**bold**`, `|highlight|`, and raw HTML in AI response all render correctly

3. **Expected behavior**: Overall progress bar always reflects the correct step count per job type. Wrong question flow omits KB query, matching, and analysis steps. Standard/batch flow consolidates graph/cards/cheatsheet/review into a single "generate_materials" step.

4. **Known limitations**: Local `node_modules` is corrupted (linux-only packages on Windows) — builds must be run on the server. Tunnel URL is from the existing process started on 2026-05-22.
```

> **IMPORTANT**: Use `---` to separate the 3 sections (Files Changed / New Features / Next Steps). The tunnel URL must be checked and included in every report where the server was redeployed.
---


## Repository

- **Local workspace:** `C:\Users\64887\ocr-kb-matcher`
- **GitHub:** https://github.com/nathanz3491/ocr-kb-matcher (private)
- **Stack:** TypeScript, Next.js 16.2.1 (frontend), Express (backend), Tesseract.js OCR, Moonshot AI, React Flow (`@xyflow/react` v12), Resend email, `@base-ui/react`
- **Note:** Two nested sub-repos exist — `ocr-kb-matcher-github/` and `temp/` — these are not the main workspace.

---

## Local Dev

- **Frontend:** `http://localhost:3000` — `cd frontend && npm run dev`
- **Backend:** `http://localhost:3001` — `cd backend && npm run dev`
- **Start both:** Run both commands above in separate terminals (no root `package.json` or workspace runner)
- **Required env:**
  - `backend/.env` — create from env vars: `MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL`, `MOONSHOT_MODEL`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `LOG_LEVEL`, `QUEUE_POLL_INTERVAL_MS`. Neo4j vars are unused (JSON file storage is active).
  - `frontend/.env.local` — `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`

### Backend env loading quirk

`backend/src/index.ts` reads `JWT_SECRET` and `JWT_REFRESH_SECRET` from `backend/.env` **manually** (custom parser, not dotenv) before the Express app starts. Ensure these two vars are present in `backend/.env` for the backend to start correctly.

### Backend startup sequence (`backend/src/index.ts`)

1. Load JWT secrets from `backend/.env`
2. Server listens on PORT
3. Initialize knowledge graph storage (`getKnowledgeGraphStorage().initialize()`)
4. Check for stale jobs from previous crash (`queueProcessor.checkStaleJobs()`)
5. Start queue polling (default: every 5s, configurable via `QUEUE_POLL_INTERVAL_MS`)
6. Attach event listeners: `job:started`, `job:completed`, `job:failed`, `job:timeout`
7. Graceful shutdown on SIGTERM/SIGINT — stops polling, waits 10s max

---

## Server Deployment

### SSH (use `ssh-connection` skill)

**Server:** `vectorserver` · `139.199.220.244` · Port `6000` · User `nathan`
**SSH Key:** `~/.ssh/id_ed25519`
**Public key for server auth:** `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGbnEMPtbEKqSARKHxaKmOu9aWQi4RMCWK2ttqFfya3R sisyphus-agent`

```bash
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -p 6000 nathan@139.199.220.244
ssh vectorserver  # if ~/.ssh/config is set up
```

**SCP:**
```bash
scp -i ~/.ssh/id_ed25519 -P 6000 local_file.txt nathan@139.199.220.244:/home/nathan/
```

**Deploy workflow:** Develop locally → SCP/rsync → rebuild → PM2 restart on server.

### PM2 (not in default PATH)

PM2 is installed via NVM. **Always use the correct PATH** or the `start-pm2.sh` helper:

```bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
/home/nathan/.nvm/versions/node/v20.20.2/bin/pm2 list
/home/nathan/.nvm/versions/node/v20.20.2/bin/pm2 restart all
```

Or use the helper script:
```bash
bash /home/nathan/ocr-kb-matcher/start-pm2.sh
```

### PM2 processes (`/home/nathan/ocr-kb-matcher/ecosystem.config.js`)

3 processes managed by PM2:

| Process | Entry | Port | Notes |
|---|---|---|---|
| `frontend` | Next.js binary | 3000 | `NEXT_PUBLIC_API_BASE_URL=https://mastri.app` |
| `backend` | `dist/backend/src/index.js` | 3001 | CORS: `https://mastri.app` |
| `proxy-https` | `reverse-proxy-https.js` | 8081 | SSL termination → mastri.app certs at `ssl/mastri.app` |

> **Production domain:** `https://mastri.app` (HTTPS reverse proxy on 8081).

### Server deploy steps

```bash
# Build backend (local → server via SCP)
# Backend entry: dist/backend/src/index.js (NESTED — not dist/index.js)
# tsconfig rootDir is ".." so output goes dist/backend/src/...

# After uploading build:
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
cd /home/nathan/ocr-kb-matcher/backend && npm run build
pm2 restart backend && pm2 restart frontend
```

### Backend env on server

`/home/nathan/ocr-kb-matcher/backend/.env` contains Moonshot API keys. JWT secrets are also embedded in `ecosystem.config.js` env vars. Both must be present for the backend to start correctly (custom env loader reads `JWT_SECRET`/`JWT_REFRESH_SECRET` from `.env`).

> **Always load `ssh-connection` skill for server work.**

---

## Cloudflare Tunnel & Production Domain

### Production: `https://mastri.app`

A **named Cloudflare Tunnel** connects `mastri.app` to the server — no firewall ports needed.

**Tunnel ID:** `mastri-app` (`fc20e7c6-5fd2-4bbb-a004-c212db88a46b`)
**Config:** `/home/nathan/.cloudflared/config.yml`
**Cert:** `/home/nathan/.cloudflared/cert.pem`

```yaml
# /home/nathan/.cloudflared/config.yml
tunnel: fc20e7c6-5fd2-4bbb-a004-c212db88a46b
credentials-file: /home/nathan/.cloudflared/fc20e7c6-5fd2-4bbb-a004-c212db88a46b.json

ingress:
  - hostname: mastri.app
    service: http://localhost:8080
  - hostname: '*.mastri.app'
    service: http://localhost:8080
  - service: http_status:404
```

**Start tunnel:**
```bash
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -p 6000 nathan@139.199.220.244 "nohup /home/nathan/cloudflared tunnel run mastri-app > /home/nathan/cf_tunnel.log 2>&1 &"
```

**Check status:**
```bash
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -p 6000 nathan@139.199.220.244 "tail -5 /home/nathan/cf_tunnel.log"
```

### Temporary Quick Tunnel (for testing)

Use `--url` flag for a temporary `trycloudflare.com` URL:
```bash
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -p 6000 nathan@139.199.220.244 "/home/nathan/cloudflared tunnel --url http://localhost:8080 > /home/nathan/cf_tunnel.log 2>&1 &"
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -p 6000 nathan@139.199.220.244 "sleep 8; cat /home/nathan/cf_tunnel.log | grep -E 'trycloudflare'"
```
URL changes every restart. Named tunnel (mastri.app) is permanent.

### Notes
- **Binary location:** `/home/nathan/cloudflared`
- **Log file:** `/home/nathan/cf_tunnel.log`
- **Tunnel exposes port 8080** — the HTTP reverse proxy (`reverse-proxy-http.js`). Port 8081 is the HTTPS reverse proxy (`reverse-proxy-https.js`).
- **HTTP proxy startup:** `/home/nathan/.nvm/versions/node/v20.20.2/bin/node /home/nathan/ocr-kb-matcher/reverse-proxy-http.js`
- Cloudflare provides **free SSL** — no certbot, no self-signed certs needed
- **WebSocket/Socket.IO** works through the tunnel (uses `window.location.origin` for connections → automatically resolves to `mastri.app` or tunnel URL)

---

## Project Structure

```
frontend/                    # Next.js 16.2.1, React 19, Tailwind v4, shadcn/ui, @xyflow/react
  app/                      # Pages (dashboard/, knowledge-graph/, quiz/, graph-editor/, etc.)
  components/               # ui/, upload/, results/, analytics/, quiz/, auth/, navigation/, theme/, email/, gamification/
  contexts/AuthContext.tsx
  hooks/useJobStatus.ts, useUpload.ts
  lib/api.ts, auth.ts, utils.ts

backend/                     # Express + TypeScript, strict mode
  src/
    index.ts                # Entry point — env load → KG init → stale job recovery → queue polling
    app.ts                  # Express app factory
    routes/                 # 24 route groups mounted under /api/* via routes/index.ts
    services/                # 37 service files — core business logic
    middleware/errorHandler.ts  # asyncHandler + AppError + errorHandler
    types/, prompts/

shared/types.ts              # Shared TypeScript types
```

### Key Services (`backend/src/services/`)

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

> **Storage:** JSON flat-file persistence. Neo4j vars in `.env` are unused.

### Frontend-Specific AGENTS.md

`frontend/AGENTS.md` contains detailed styling conventions (glass cards, gradient buttons, dark mode patterns, color system) and must be read before writing UI code. Do not assume generic styling.

---

## Commands

### Frontend (`cd frontend`)

```bash
npm run dev             # next dev --webpack
npm run dev:turbopack  # next dev --turbopack (faster HMR)
npm run lint           # eslint flat-config, next/core-web-vitals
npm run build          # next build --webpack
```

### Backend (`cd backend`)

```bash
npm run dev    # nodemon src/index.ts (hot reload)
npm run build # tsc → dist/
npm run start # node dist/index.js
```

> **No root `package.json` or workspace runner** — run frontend and backend commands separately.

---

## Conventions

### Backend Routes

- All routes use `asyncHandler` wrapper from `middleware/errorHandler.ts`
- Route files export a default `Router`; mounted in `routes/index.ts` under `/api/*`
- Dev-only routes (`/api/test`) guarded by `NODE_ENV !== 'production'`
- Custom errors: `new AppError(message, statusCode)` → caught by global error handler
- No DB transactions — JSON file writes are not atomic
- Auth: `optionalAuth` middleware (JWT) — attaches `userId` if token present, allows guest access

### Frontend

- **API calls:** `lib/api.ts` — raw `fetch`, auth-aware (Bearer token), uses `NEXT_PUBLIC_API_BASE_URL`
- **Dark mode:** Every component must check `useTheme().theme` (`'light' | 'dark'`)
- **Styling:** Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.*`)
- **Icons:** Lucide React — individual imports only, never barrel
- **Classes:** Always use `clsx()`/`cn()` for conditional classes
- **Colors:** Use `bg-slate-*` (never `bg-gray-*`); dark mode alternatives always required
- **Read `frontend/AGENTS.md`** for full styling system before touching UI

---

## Anti-Patterns

### Backend

- **Don't call AI directly** — use `matchWithRetry()` with exponential backoff from `ai.ts`
- **Don't assume Neo4j is active** — always use `knowledgeGraphStorage.ts` JSON persistence
- **Don't add routes without `asyncHandler`** — unhandled async errors crash Express
- **Don't mount routes at root** — all go through `routes/index.ts`
- **Don't do DB transactions** — JSON writes are not atomic

### Frontend

- **Never hardcode colors** without `theme === 'dark'` check
- **Never use bare `bg-white`** or `text-slate-700` without dark mode alternative
- **Never use `bg-gray-*`** — use `bg-slate-*` consistently
- **Never skip `clsx()`/`cn()`** for conditional classes — always use it
- **Always use Lucide React** icons (individual imports only, no barrel)

---

## Known Issues

- **README.md has merge conflicts** — contains unresolved `<<<<<<< HEAD` / `=======` / `>>>>>>> c2c7a0f` markers. Do not trust README as source of truth — verify with actual config files.
- **No root `package.json` (local)** — `C:\Users\64887\ocr-kb-matcher\` has no root package.json. Run `cd frontend && npm run dev` and `cd backend && npm run dev` separately. The **server** (`/home/nathan/ocr-kb-matcher/`) has its own root `package.json` with npm workspaces.
- **No `start.bat`** — not present in this repo.
- **No `backend/.env.example`** — create `backend/.env` manually from required vars above.
- **Frontend TypeScript errors ignored at build time** — `next.config.ts` has `typescript.ignoreBuildErrors: true`. Run `cd frontend && npx tsc --noEmit` manually to catch type errors.
- **`axios` dead dependency** — listed in `frontend/package.json` deps but `lib/api.ts` uses native `fetch`.
- **No CI workflows** — `.github/` contains only screenshots. No TypeScript check, no lint check, no tests in CI.
- **Nested sub-repos** — `ocr-kb-matcher-github/` and `temp/` exist in the workspace root. Do not confuse these with the main project.
- **Game question bank not configured** — Teacher-created games start with no questions. The `/teacher/game/new` page creates a room via Socket.IO but the quiz question generation pipeline (likely `quizService.ts` or `gameRoomService.ts`) has no seeded question bank. Games will show "no questions available" until a question source is wired.

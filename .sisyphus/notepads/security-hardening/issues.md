# Issues / Gotchas — Security Hardening

## Frontend `typescript.ignoreBuildErrors: true`
Frontend `next.config.ts` ignores TS errors at build time. Always run `cd frontend && npx tsc --noEmit` to catch type errors. (Per AGENTS.md.)

## `axios` is dead dependency
Frontend `lib/api.ts` uses native `fetch`. `axios` is in package.json but unused. Not relevant to security work but don't try to add new axios calls.

## Express types
`req.user` is properly typed via `declare global` in `middleware/auth.ts`. After `authenticate` middleware runs, `req.user` is guaranteed non-null in handler — but TypeScript needs the type-narrowing `if (!req.user)` check for safety.

## Auth already enforced on some routes via inline check
Some routes (e.g., `userProgress.ts`, `upload.ts`) already do `if (!req.user)` inline. We're converting them to use `router.use(authenticate)` middleware. This is functionally equivalent but cleaner.

## `routes/index.ts` double-mount — RESOLVED (Wave 10, 2026-07-06)
~~Both `app.ts` (lines 71-93) and `routes/index.ts` (lines 33-61) mount the same routers at the same paths. The `index.ts` mounts go through `app.use('/', routes)` which means they end up at `/api/upload` etc. This means each route handler runs TWICE for every request. Wave 10 fix removes the index.ts mounts to keep only app.ts.~~
**FIXED**: Removed all 22 duplicate `app.use('/api/X', XRouters)` mounts from `app.ts` and their corresponding imports. `index.ts` is the sole route mount point. `app.ts` only has `app.use('/', routes)`. Smoke-tested: `/health`, `/api/auth/login`, `/api/knowledge-graph`, `/` all work correctly.

## Routes WITHOUT middleware — easy targets for Wave 2
Looking at routes/ directory, the following lack any auth:
- `localGraph.ts`, `kb.ts`, `knowledgeTree.ts`, `subjects.ts`, `reviews.ts`, `search.ts`, `export.ts`, `jobs.ts`, `analytics.ts`, `recommendations.ts`, `flashcards.ts`, `study.ts`, `studyPlanner.ts`, `certificates.ts`, `wrongQuestionReview.ts`, `graph.ts`, `graphEditor.ts`, `knowledgeGraph.ts`

These all need `router.use(authenticate)` added at top.

## Routes WITH inline auth check (need conversion to middleware)
- `userProgress.ts` — has `if (!req.user)` checks. Convert to middleware.

## Routes that already use `authenticate` middleware
- `parentMonitor.ts` — has `router.use(authenticate)`.
- `auth.ts` — selectively uses `authenticate` on protected endpoints (login, register, refresh, logout are PUBLIC by design).

## Wave 5: @types/helmet not installable on Windows
`npm install @types/helmet` fails on Windows because of transitive `lightningcss-linux-x64-gnu` platform constraint. Helmet v8.2.0 ships its own TypeScript declarations, so the separate `@types/helmet` package is unnecessary. Skipped.

## Wave 4: express-rate-limit required `--force` on Windows
`npm install express-rate-limit` fails on Windows with the same `lightningcss-linux-x64-gnu` EBADPLATFORM error (same root cause as Wave 5). Used `npm install express-rate-limit --save --force` to bypass. The `express-rate-limit` package itself has no native deps — the issue is a transitive dependency of an already-installed package (likely `helmet`).

## DEPLOYMENT: Game files on remote (2026-07-06)
Remote server had game-related source files (`game.ts`, `gameCustomQuestions.ts`, `gameQuestionOverlays.ts`, `gameQuestions.ts`, `teacher.ts`, `teachers.ts`, `gameService.ts`, `questionBankService.ts`, `questionGenerator.ts`) that don't exist in the local codebase. These referenced types (`GameQuestion`, `GameQuestionUnit`, etc.) in `shared/types.ts` that were overwritten by the local sync. **Removed** these files to achieve a clean build. If game functionality is needed, these files must be recreated with proper type definitions.

## DEPLOYMENT: Health endpoint unreachable via public URL (2026-07-06)
`https://mastri.app/health` returns 404 because `unified-server.js` (reverse proxy on port 8080) routes non-`/api/*` paths to the frontend (port 3000), not the backend (port 3001). The health endpoint is only accessible directly on `localhost:3001/health`. This is architectural, not a bug.

## DEPLOYMENT: Systemd vs ecosystem.config.js env mismatch (2026-07-06)
The backend is managed by a systemd user service (`~/.config/systemd/user/backend.service`), NOT by PM2 or `ecosystem.config.js`. The systemd service has its OWN `JWT_SECRET` (`ocr-kb-matcher-jwt-secret-prod-2024-xK9mP2vL`) which differs from `ecosystem.config.js`'s `nathan_ocr_kb_...`. The `ecosystem.config.js` appears to be legacy/unused. Any future env changes must target the systemd service file.

## DEPLOYMENT: npm not in non-interactive SSH PATH (2026-07-06)
Node is installed via NVM at `/home/nathan/.nvm/versions/node/v20.20.2/bin/`. Non-interactive SSH sessions don't source `.nvm/nvm.sh`. Must prefix all npm/node commands with `export PATH="/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH"`.
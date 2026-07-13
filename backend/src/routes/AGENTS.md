# Backend Routes

26 Express route files. All mounted under `router.use('/api/...')` in `routes/index.ts`. New routes must be registered there — never mounted at the express app root.

> Read the root `/AGENTS.md` first for repo-wide context. The Express app factory wiring (helmet, CORS, rate limiter, optionalAuth, audit, body parser) is in `backend/src/app.ts`.

## Structure

```
routes/
├── index.ts                          # Mounts all 26 route groups + /health, /, /test-error, /test-async-error
├── upload.ts                         # /api/upload — file upload (multer)
├── jobs.ts                           # /api/jobs — job queue CRUD
├── graph.ts                          # /api/graph — knowledge graph (legacy)
├── knowledgeGraph.ts                 # /api/knowledge-graph — KG CRUD + storage
├── localGraph.ts                     # /api/local-graph — per-job graph
├── graphEditor.ts                    # /api/graph-editor
├── knowledgeTree.ts                  # /api/knowledge-tree — tree structure
├── quiz.ts                           # /api/quiz — generate/submit quizzes
├── flashcards.ts                     # /api/flashcards — CRUD + generate
├── study.ts                          # /api/study — cheat-sheets, notes
├── studyPlanner.ts                   # /api/study-plan
├── reviews.ts                        # /api/reviews — SM-2 due queue
├── wrongQuestionReview.ts            # /api/wrong-questions
├── analytics.ts                      # /api/analytics — stats overview
├── chat.ts                           # /api/chat — chat history
├── search.ts                         # /api/search — universal search
├── export.ts                         # /api/export — PDF export
├── certificates.ts                   # /api/certificates
├── subjects.ts                       # /api/subjects
├── recommendations.ts                # /api/recommendations
├── kb.ts                             # /api/kb — knowledge base
├── auth.ts                           # /api/auth — register, login, verify, refresh, me, students
├── userProgress.ts                   # /api/user-progress
├── userSettings.ts                   # /api/user (settings, profile)
├── parentMonitor.ts                  # /api/parent-monitor — parent ↔ student links
├── test.ts                           # /api/test — dev-only error testing
└── types.ts                          # Local TS types (NOT a route; mirrors shared/types.ts — vestigial duplication)
```

> **`routes/types.ts` is a stale duplicate of `shared/types.ts`** — contains the exact same User/Job/GraphNode/etc. type definitions. When editing shared types, edit `shared/types.ts` (the canonical source). The duplicate can be deleted, but it's still imported from one or more route files.

## Conventions

- All routes use `asyncHandler` wrapper from `middleware/errorHandler.ts` — **mandatory**
- Route files export a `default Router` instance (not named)
- Dev-only routes (`test.ts`, plus the `/test-error` and `/test-async-error` handlers in `index.ts`) are guarded by `if (process.env.NODE_ENV === 'production') throw new AppError(...)`
- Standard pattern: `router.get/post/put/delete(path, asyncHandler(async (req, res) => { ... }))`
- Input validation via `validate` middleware (`middleware/validate.ts`) — prefer Zod schemas, throw `AppError` for failures
- Custom errors: `throw new AppError(message, statusCode)` — caught globally, JSON-shaped response
- Response shape: `ApiResponse<T>` from `shared/types.ts` — `{ success, data?, error? }` (most modules use this)

## Cross-cutting middleware (in app.ts)

Applied to **every** route (in this order):

1. `helmet()` — security headers (must run before CORS)
2. `cors(...)` — allow-list via `CORS_ORIGIN` env + `*.trycloudflare.com` regex match
3. `express.json({ limit: '10mb' })` + `urlencoded({ limit: '10mb' })`
4. `loggerMiddleware` — request log
5. `generalLimiter` — **300 req/min per IP**, skips `/health`
6. `optionalAuth` — extracts `userId` from JWT if present, does NOT block
7. `auditMiddleware` — logs 401/403/mutations

Plus `TRUST_PROXY=1` enables `app.set('trust proxy', 1)` for Cloudflare/reverse proxy deployments.

For auth-sensitive endpoints (login, register, upload), apply `authLimiter` / `uploadLimiter` from `middleware/rateLimit.ts` per-route.

## Anti-Patterns (THIS DIR)

- **Don't add routes without `asyncHandler`** — unhandled async errors crash Express
- **Don't mount routes at root** — all go through `routes/index.ts` via `router.use('/api/...')`
- **No route-level JWT enforcement here** — auth is `optionalAuth` upstream; gates belong in the service layer or as `requireAuth`-style middleware if needed
- **Don't write to JSON files transactionally** — JSON file writes are not atomic; the storage layer adds its own locking
- **Don't `res.json()` ad-hoc shapes** — use `ApiResponse<T>` from `shared/types.ts` so the frontend `lib/api.ts` consumer can parse consistently
- **Don't bypass dev-only guards in production paths** — `test.ts` must throw `AppError(..., 404)` when `NODE_ENV === 'production'`
# Backend Routes

24 Express route files. All mounted under `router.use('/api/...')` in `routes/index.ts`.

## Structure

```
routes/
├── index.ts           # Mounts all 24 route groups
├── upload.ts          # /api/upload — file upload (multer)
├── jobs.ts            # /api/jobs — job queue CRUD
├── graph.ts           # /api/graph — knowledge graph (legacy)
├── knowledgeGraph.ts  # /api/knowledge-graph — KG CRUD + storage
├── quiz.ts            # /api/quiz — generate/submit quizzes
├── flashcards.ts      # /api/flashcards — CRUD + generate
├── study.ts           # /api/study — cheat-sheets, notes
├── reviews.ts         # /api/reviews — SM-2 due queue
├── analytics.ts       # /api/analytics — stats overview
├── chat.ts            # /api/chat — chat history
├── search.ts          # /api/search — universal search
├── export.ts          # /api/export — PDF export
├── certificates.ts    # /api/certificates
├── subjects.ts        # /api/subjects
├── recommendations.ts # /api/recommendations
├── localGraph.ts      # /api/local-graph — per-job graph
├── kb.ts              # /api/kb — knowledge base
├── knowledgeTree.ts   # /api/knowledge-tree — tree structure
├── graphEditor.ts     # /api/graph-editor
├── studyPlanner.ts    # /api/study-plan
├── userProgress.ts    # /api/user-progress
├── wrongQuestionReview.ts  # /api/wrong-questions
├── test.ts            # /api/test — dev-only error testing
```

## Conventions

- All routes use `asyncHandler` wrapper from `middleware/errorHandler.ts`
- Route files export a default `Router` instance
- Dev-only routes (`test.ts`) guarded by `NODE_ENV !== 'production'`
- Standard pattern: `router.get/post/put/delete(path, asyncHandler(async (req, res) => { ... }))`

## Anti-Patterns (THIS DIR)

- **Don't add routes without `asyncHandler`** — unhandled async errors crash Express
- **Don't mount routes at root** — all go through `routes/index.ts` via `router.use()`
- **No route-level auth middleware here** — auth handled upstream

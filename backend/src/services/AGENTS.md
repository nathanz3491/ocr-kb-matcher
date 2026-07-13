# Backend Services

37 service files. Core business logic. **No Express routing here** — services are pure functions/classes consumed by `routes/`.

> Read the root `/AGENTS.md` first for repo-wide context. `routes/index.ts` is the only consumer of these services from the HTTP layer; jobs/services may also call each other.

## Key Services

| Category | File | Purpose |
|---|---|---|
| **Pipeline (orchestrator)** | `jobProcessor.ts` | Full doc pipeline: OCR → chunk → AI match → enrich (~803 lines, largest file) |
| **AI** | `ai.ts` | Moonshot via OpenAI-compatible client; `getMoonshotConfig()` + `createOpenAIClient()` + `matchWithRetry()` w/ exponential backoff (default 3 retries, 120s timeout) |
| **KB Matching** | `aiKnowledgeMatching.ts` | AI matching against the knowledge tree |
| **Graph CRUD** | `knowledgeGraph.ts` | Graph operations + traversal |
| **Graph Editor** | `knowledgeGraphEditor.ts` | Graph editor operations (rename, merge, etc.) |
| **Graph Storage** | `knowledgeGraphStorage.ts` | **JSON flat-file persistence** — singleton `getKnowledgeGraphStorage()`; Neo4j is vestigial |
| **OCR** | `ocr.ts` | Tesseract.js pipeline, magic-byte validation, optional ImageMagick preprocessing, path sanitization |
| **Text Extract** | `textExtractor.ts` | PDF / DOCX / PPTX text extraction (mammoth, pdfkit; NO pdf-parse/pdfjs — root deps are vestigial) |
| **Quiz** | `quizService.ts` | Adaptive quiz generation + scoring |
| **Quiz Storage** | `quizStorage.ts` | Quiz persistence (JSON) |
| **Review** | `reviewService.ts` | SM-2 spaced repetition algorithm |
| **Flashcards** | `flashcardService.ts` | AI flashcard generation |
| **Study Materials** | `studyMaterialService.ts` | Cheat sheets + study notes generation |
| **Queue** | `queueProcessor.ts` | Async job queue — `checkStaleJobs()` on boot, then 5s polling; emits `job:started/completed/failed/timeout` events |
| **Job CRUD** | `jobService.ts` | Job CRUD + status transitions |
| **Progress** | `userProgressService.ts` | Per-user mastery tracking |
| **Graph Gen** | `graphGeneration.ts` | Generate graph from raw text |
| **Batch Match** | `batchMatching.ts` | Batch question-to-KB matching |
| **Question Parse** | `questionParser.ts` | Parse questions out of OCR text |
| **Wrong Q** | `wrongQuestionService.ts` | Wrong question explain + practice gen |
| **Wrong Q Review** | `wrongQuestionReviewService.ts` | Aggregates wrong questions for review sessions |
| **Analytics** | `analyticsService.ts` | Stats computation |
| **Export** | `exportService.ts` | Generic export orchestration |
| **PDF Export** | `pdfExportService.ts` | PDF generation (pdfkit) |
| **Timeline** | `timelineService.ts` | Study timeline rendering |
| **Gap Analysis** | `gapAnalysisService.ts` | Knowledge gap detection |
| **Knowledge Tree** | `knowledgeTreeService.ts` | Tree structure + LLM export |
| **Subjects** | `subjectService.ts` | Subject management |
| **KB** | `knowledgeBase.ts` | Knowledge base ops |
| **KB Editor** | `knowledgeGraphEditor.ts` | (see above) |
| **Study Planner** | `studyPlannerService.ts` | AI study plan generation |
| **Reco** | `recommendationService.ts` | Content recommendations |
| **Email** | `emailService.ts` | Resend email send |
| **Email Validation** | `emailValidation.ts` | Email format + verification helpers |
| **JWT** | `jwtService.ts` | JWT sign/verify (`jwtService.sign(payload)`); used by `auth.ts` middleware |
| **Token Revocation** | `tokenRevocation.ts` | Logout / revoked-token checks |
| **User** | `userService.ts` | User CRUD + bcryptjs password hashing |
| **Parent Link** | `parentLinkService.ts` | Parent ↔ student link codes (used by `/api/parent-monitor`) |

## Conventions

- Services export either **classes** (`class JobProcessor`, `class KnowledgeGraph`) OR **singleton instances** (`export const userProgressService = ...`)
- Singleton getters use `getX()` factory pattern: `getKnowledgeGraphStorage()`, `getJobProcessor()`
- AI calls **must** wrap in retry logic — use `matchWithRetry()` from `ai.ts`. For custom flows, compose `getMoonshotConfig()` + `createOpenAIClient()`.
- OCR results shape: `{ text, confidence, processingTime, language }`
- SM-2 review shape: `{ userId, nodeId, easiness, interval, repetitions, nextReview, lastReview }`
- Job status flow: `PENDING → PROCESSING → OCR_COMPLETE → MATCHING → COMPLETED` (or `FAILED`); defined in `shared/types.ts` as `ProcessingStatus` enum
- Email: `emailService` uses Resend SDK; reads `RESEND_API_KEY` / `EMAIL_FROM_NAME` / `EMAIL_FROM` from env
- Auth: `jwtService.sign(payload, expiresIn)` → JWT string; `jwtService.verify(token)` → payload; tokens stored via `tokenRevocation` for logout

## Anti-Patterns (THIS DIR)

- **Don't call AI directly** — wrap in retry logic, use `matchWithRetry()`. Raw `openai` calls skip backoff and break under rate limits.
- **Don't assume Neo4j** — use `knowledgeGraphStorage.ts` JSON persistence. `NEO4J_*` env vars in `.env.example` are dead.
- **Don't do DB transactions** — JSON writes are not atomic. The storage layer serializes reads/writes manually.
- **Don't block on AI calls** — always `await` with timeout (default 120s in `ai.ts`)
- **Don't import Express here** — services must remain transport-agnostic. If you need `req`/`res`, that's a route concern; expose a service function the route calls.
- **Don't add circular service deps** — `jobProcessor` already depends on most services; new cross-service wiring goes through the queue/AI/storage layers, not direct calls into quiz/review/etc.
- **Don't bypass `getKnowledgeGraphStorage().initialize()`** — it's called on boot in `src/index.ts`; calling it again mid-request or in tests without resetting will corrupt state.
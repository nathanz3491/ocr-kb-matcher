# Backend Services

21 service files. Core business logic. No Express routing here — pure functions/classes.

## Key Services

| Service | File | Purpose |
|---|---|---|
| **Pipeline** | `jobProcessor.ts` | Orchestrates full doc pipeline (803 lines — largest) |
| **AI** | `ai.ts` | Moonshot API, retry + backoff, JSON parsing |
| **KB Matching** | `aiKnowledgeMatching.ts` | AI matching against knowledge tree |
| **Graph** | `knowledgeGraph.ts` | Graph CRUD + traversal |
| **Graph Storage** | `knowledgeGraphStorage.ts` | JSON flat-file persistence |
| **OCR** | `ocr.ts` | Tesseract.js pipeline, path sanitization |
| **Quiz** | `quizService.ts` | Adaptive quiz generation + scoring |
| **Review** | `reviewService.ts` | SM-2 spaced repetition algorithm |
| **Flashcards** | `flashcardService.ts` | AI flashcard generation |
| **Study Materials** | `studyMaterialService.ts` | Cheat sheets + study notes |
| **Queue** | `queueProcessor.ts` | Async job queue with retry logic |
| **Job** | `jobService.ts` | Job CRUD + status updates |
| **Progress** | `userProgressService.ts` | Per-user mastery tracking |
| **Text Extract** | `textExtractor.ts` | PDF/DOCX/PPTX text extraction |
| **Graph Gen** | `graphGeneration.ts` | Generate graph from raw text |
| **Batch Match** | `batchMatching.ts` | Batch question-to-KB matching |
| **Question Parse** | `questionParser.ts` | Parse questions from OCR text |
| **Wrong Q** | `wrongQuestionService.ts` | Wrong question explain + practice |
| **Analytics** | `analyticsService.ts` | Stats computation |
| **Export** | `exportService.ts` | PDF export via pdfkit |
| **Timeline** | `timelineService.ts` | Study timeline |
| **Gap Analysis** | `gapAnalysisService.ts` | Knowledge gap detection |
| **Knowledge Tree** | `knowledgeTreeService.ts` | Tree structure + LLM export |
| **Subjects** | `subjectService.ts` | Subject management |
| **KB** | `knowledgeBase.ts` | Knowledge base ops |
| **KB Editor** | `knowledgeGraphEditor.ts` | Graph editor ops |
| **PDF Export** | `pdfExportService.ts` | PDF generation |
| **Study Planner** | `studyPlannerService.ts` | Study plan generation |
| **Reco** | `recommendationService.ts` | Content recommendations |

## Conventions

- Services export classes (`JobProcessor`, `KnowledgeGraph`) OR singleton instances (`userProgressService`)
- Singleton getters: `getKnowledgeGraphStorage()`, `getJobProcessor()`
- AI calls use `matchWithRetry()` with exponential backoff
- OCR results include `{ text, confidence, processingTime, language }`
- SM-2 review: `{ userId, nodeId, easiness, interval, repetitions, nextReview, lastReview }`

## Anti-Patterns (THIS DIR)

- **Don't call AI directly** — wrap in retry logic, use `matchWithRetry()`
- **Don't assume Neo4j** — use `knowledgeGraphStorage.ts` JSON persistence
- **Don't do DB transactions** — JSON writes are not atomic
- **Don't block on AI calls** — always await with timeout

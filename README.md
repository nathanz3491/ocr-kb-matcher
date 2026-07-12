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

## Project Structure

```
backend/
├── src/
│   ├── routes/           # 20+ route groups
│   │   ├── graph.ts      # Knowledge graph endpoints
│   │   ├── quiz.ts       # Quiz generation & submission
│   │   ├── jobs.ts      # Job queue management
│   │   ├── flashcards.ts  # Flashcard CRUD
│   │   └── ...
│   ├── services/
│   │   ├── jobProcessor.ts           # Main processing pipeline
│   │   ├── knowledgeGraph.ts        # Graph operations
│   │   ├── knowledgeGraphStorage.ts  # JSON persistence
│   │   ├── aiKnowledgeMatching.ts    # Moonshot AI matching
│   │   ├── quizService.ts          # Adaptive quiz logic
│   │   ├── reviewService.ts        # SM-2 spaced repetition
│   │   ├── flashcardService.ts    # Flashcard generation
│   │   ├── studyMaterialService.ts  # Cheat sheets & notes
│   │   ├── ocr.ts                # Tesseract.js pipeline
│   │   └── queueProcessor.ts       # Async job queue
│   └── data/             # JSON file storage
│       ├── knowledge-graph.json
│       ├── flashcards/
│       └── user-progress.json
```

---

## Environment Variables

```env
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
MOONSHOT_API_KEY=sk-...       # Required — AI matching and generation
NEO4J_URI=bolt://localhost:7687  # Optional — not currently used
NEO4J_PASSWORD=
```

---

## Development

```bash
# Backend only
cd backend && npm install && npm run dev

# TypeScript check
npx tsc --noEmit
```

---

## License

MIT

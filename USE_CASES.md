# OCR Knowledge Base Matcher — Use Cases & Key Benefits

<p align="center">
  <strong>Transform how you learn — from scattered notes to a structured, intelligent knowledge network.</strong>
</p>

---

## The Problem: Why Students Struggle to Retain Knowledge

Most learners face four recurring pain points that silently sabotage their study efforts:

| Pain Point | What It Looks Like in Practice |
|---|---|
| **Scattered materials** | PDFs, photos of lecture notes, PPT slides, and past exam papers live in different folders — no unified view |
| **Unclear priorities** | No visibility into what you actually know vs. what you only *think* you know |
| **Blind drilling** | Practicing entire chapters with questions you already mastered, while ignoring real weak spots |
| **Forgetting without recall** | Cramming works for the exam tomorrow, but the knowledge is gone within a week |

Traditional study tools address one or two of these. This platform tackles all four simultaneously.

---

## What This Platform Solves

### 1. Unified Material Import — No More Folder Chaos

**Problem:** Your notes are in handwritten scans, lecture PDFs, and screenshot photos. Moving them into a study system is manual and tedious.

**Solution:** Upload any format — photos, PDFs, DOCX — and AI extracts the content automatically.

- Drag-and-drop, paste, or snap a photo
- AI-Powered OCR (Tesseract.js) extracts text from any image quality
- Multi-language support: Chinese, English, math symbols, and more
- Files are processed and stored, then cleaned up automatically

**Why it matters:** Students report spending 30–60 minutes manually re-typing notes. This removes that friction entirely.

---

### 2. Knowledge Graph — See the Full Picture

**Problem:** Notes and chapters exist as isolated pages. You never see how "Quadratic Equations" connects to "Polynomials" or leads into "Calculus."

**Solution:** All extracted content is organized into an interactive knowledge graph — nodes for concepts, edges for relationships (preceded_by, related_to, part_of, etc.).

Key capabilities:

- **Visual graph editor** — drag nodes, create connections, color-code by category
- **Prerequisite chains** — mark A02 as a prerequisite for A03; the graph enforces and visualizes learning order
- **Mastery tracking per node** — each node shows learned / not learned / in-progress status
- **PNG export** — share your knowledge map with classmates
- **Full-text search** — find any concept instantly across the entire graph
- **Local JSON cache** — works offline, no dependency on external databases at startup

**Why it matters:** Research consistently shows that *connected knowledge* is retained far better than isolated facts. The graph makes implicit relationships explicit.

---

### 3. Intelligent Gap Detection — Study What Actually Needs Studying

**Problem:** Standard quizzes test randomly. You might ace the questions you know and repeat the same mistakes on questions you don't.

**Solution:** AI matches new documents against your existing knowledge graph to identify:

- **Overlaps** — content already in your graph (review mode)
- **Gaps** — new concepts that should be added (study mode)
- **Connections** — where new content bridges existing knowledge clusters

No more guessing. The system tells you exactly what's new in a document and where it fits.

---

### 4. Adaptive Quizzing — Right Questions, Right Time

**Problem:** Generating good practice questions is hard. Finding ones that target your specific weaknesses is nearly impossible.

**Solution:** AI generates personalized quizzes from any knowledge graph node or uploaded document.

- Questions adapt based on your performance history
- Wrong answers are automatically queued for spaced repetition review
- Immediate feedback with explanations after each answer
- Multiple quiz formats (multiple choice, fill-in-the-blank, etc.)

**Why it matters:** Studies on adaptive learning consistently show 20–40% better retention compared to static practice sets.

---

### 5. Spaced Repetition (SM-2) — Remember More, Forget Less

**Problem:** Even when you study something well, the forgetting curve takes over. Without scheduled review, you lose it within days.

**Solution:** Every wrong answer and every learned node enters the SM-2 spaced repetition queue.

- The algorithm schedules review at the scientifically optimal moment (just before you'd forget)
- Review cards surface in the dashboard when due
- Mastery score per node reflects both recent performance and review consistency
- Progress heatmap shows your learning streak and study calendar

**Why it matters:** Spaced repetition is one of the most well-validated techniques in cognitive science for long-term retention.

---

### 6. AI-Generated Study Materials

Beyond quizzes, the platform generates three types of study aids from any node in your knowledge graph:

| Material Type | What It Is |
|---|---|
| **Flashcards** | AI-generated question–answer pairs, ready for SM-2 review |
| **Cheat Sheets** | Condensed summaries of a topic with key formulas, definitions, and relationships |
| **Study Notes** | Structured notes covering the topic at exam depth |

All generated from the knowledge graph — meaning they're always in sync with your actual learning structure.

---

### 7. AI Chat — Talk to Your Knowledge Graph

A conversational interface that reads your knowledge graph as context. Ask questions, and the AI answers using your stored knowledge — not general web data.

- Multi-session chat management with sidebar navigation
- Markdown-formatted AI responses
- Dark/light theme with Apple-style design
- Context-aware: the AI can see your graph, your mastery levels, and your review history

**Why it matters:** Instead of searching through notes manually, you can ask "What are the prerequisites for understanding this chapter?" or "Explain this concept in simple terms" and get answers grounded in your own study material.

---

## Core Workflow

![Core Workflow](.github/screenshot-workflow.png)
Each step is powered by AI and happens in seconds.

---

## Key Platform Capabilities at a Glance

### Import & Processing
- 📤 Multi-format upload: photos, PDFs, DOCX
- 📷 Camera capture with real-time preview
- 🔍 Tesseract.js OCR with multi-language support
- 🤖 Moonshot AI for content chunking and structuring
- ⏳ Real-time processing progress with encouragement messages

### Knowledge Management
- 🗺️ Interactive React Flow-based graph editor
- 🔗 Rich relationship types: prerequisite, related, part-of, preceded-by
- 📊 Mastery level tracking per node (not learned / in-progress / mastered)
- 🔎 Full-text search across all nodes and content
- 📤 PNG export of the complete knowledge graph
- 💾 Local JSON persistence — works offline

### Adaptive Learning
- ❓ AI-generated adaptive quizzes with multiple question types
- 📝 Flashcards auto-generated from any knowledge node
- 📑 Cheat sheets and study notes on demand
- 🔁 SM-2 spaced repetition with due-date queue
- 📈 Analytics: mastery heatmaps, study streaks, weak-point identification

### AI Assistant
- 💬 Conversational AI grounded in your knowledge graph
- 📋 Multi-session management with sidebar navigation
- ✏️ Markdown rendering for formatted responses
- 🌙 Dark/light theme support

### User Experience
- 🌙 Dark mode with theme persistence
- 🔔 Toast notifications for success/error/loading states
- 💠 Skeleton screens with shimmer animations during load
- 🎊 Celebration effects on quiz completion
- 📱 Responsive layout for mobile, tablet, and desktop
- 🏆 Achievement certificates for milestones
- ⏰ Relative timestamps ("3 minutes ago" format)

---

## Who Is This For?

| User | How They Benefit |
|---|---|
| **Students preparing for exams** | Identify gaps, focus study time, retain more with spaced repetition |
| **Self-learners** | Build a structured knowledge base from any online or offline source |
| **Language learners** | Track vocabulary and grammar points as knowledge nodes with quiz review |
| **Professionals** | Convert technical documents, reports, and manuals into study material |
| **Teachers** | Upload curriculum materials, generate practice sets for students |

---

## Comparison: This Platform vs. Traditional Study Methods

| Aspect | Traditional | This Platform |
|---|---|---|
| Material organization | Manual, scattered | Auto-imported, graph-structured |
| Gap identification | Teacher guesswork | AI-powered gap detection |
| Practice questions | Pre-made, generic | AI-generated, adaptive |
| Review scheduling | Ad hoc or none | SM-2 automated |
| Knowledge connections | Implicit, forgotten | Visualized, explicit |
| Progress tracking | Paper gradebooks | Real-time mastery heatmaps |
| Offline access | Paper only | Local JSON cache |

---

## Getting Started

```bash
npm install
cp backend/.env.example backend/.env
# Add your MOONSHOT_API_KEY to backend/.env
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000), upload your first document, and watch your knowledge graph come alive.

For full technical documentation, see the main [README.md](README.md).

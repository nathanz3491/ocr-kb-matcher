# OCR Knowledge Base Matcher — Documentation

**AI-powered education platform** — extract structured knowledge from documents, build knowledge graphs, and generate adaptive study materials with spaced repetition.

> OCR → Knowledge Graph → Flashcards · Quizzes · Cheat Sheets · SM-2 Review

---

## Quick Links

### For Users

| Document | Language | Description |
|---|---|---|
| [User Guide](USER_GUIDE.md) | 中文 | Complete end-user guide: registration, trial, uploads, knowledge graph, flashcards, quizzes, cheat sheets, study notes, AI chat, wrong-question review, subject packs, subscription, payment (WeChat Pay), account settings, FAQ |
| [Pricing](PRICING.md) | 中文 | Tier comparison table, quota limits, WeChat Pay payment, trial terms, refund policy (7-day), FAQ |

### For Developers

| Document | Language | Description |
|---|---|---|
| [Architecture](ARCHITECTURE.md) | English | System design: high-level diagram, tech stack, data flow, component breakdown, multi-user model, subscription enforcement, job queue architecture, external dependencies |
| [API Reference](API.md) | English | REST API: JWT Bearer auth, all endpoints (auth, upload, jobs, quiz, flashcards, study, reviews, admin, user/quota), per-endpoint method/path/auth/body/response/error codes |
| [Development](DEVELOPMENT.md) | English | Dev setup, env config, codebase tour, code style, testing, common tasks, anti-patterns |
| [Security](SECURITY.md) | English | Auth, password hashing, rate limits, brute-force protection, free trial abuse prevention, admin actions, quota enforcement, webhook idempotency, upload validation, CORS, Helmet, PIPL/GDPR compliance |

### For Operators

| Document | Language | Description |
|---|---|---|
| [Deployment](DEPLOYMENT.md) | English | Production deployment: Tencent Lighthouse, HTTPS, env vars, PM2, monitoring (Sentry + UptimeRobot), daily backups, rollback, scaling notes |
| [Troubleshooting](TROUBLESHOOTING.md) | English | Common issues: backend won't start, frontend can't connect, OCR gibberish, empty graph, quota exceeded, WeChat Pay webhook not received, slow performance, circuit breaker open, database corruption |
| [Changelog](CHANGELOG.md) | English | Version history in Keep a Changelog format |
| [Roadmap](ROADMAP.md) | English | Future plans: Q1 WeChat Pay live, Q2 1000 paid users, Q3 BullMQ/Redis, Q4 iOS |

---

## Status

| Indicator | Status |
|---|---|
| **Current Version** | 1.0.0-beta |
| **Backend Stack** | Express 4 + TypeScript + better-sqlite3 + Tesseract.js |
| **Frontend Stack** | Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui |
| **AI Provider** | Moonshot AI (OpenAI-compatible) |
| **Storage** | SQLite (better-sqlite3, WAL mode) |
| **Persistence** | JSON files (legacy) → SQLite (migrated Tasks 2–3) |
| **Monitoring** | Sentry (errors) + UptimeRobot (health) + pino (structured logs) |
| **Test Coverage** | 57 billing-critical tests (Jest + ts-jest) |
| **CI/CD** | None yet (planned Q2) |
| **Deployment** | Tencent Lighthouse (4C4G, PM2 ecosystem) |

---

## Project One-Liner

Upload a PDF or image, let AI extract its knowledge into a visual graph, then study with auto-generated flashcards, adaptive quizzes, cheat sheets, and SM-2 spaced repetition — all powered by your own knowledge base.

---

**Last updated:** 2026-07-12

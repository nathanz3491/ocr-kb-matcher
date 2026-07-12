# Roadmap

> Future plans and milestones for the OCR Knowledge Base Matcher.
> Timelines are estimates and subject to change based on user feedback and market conditions.

---

## Q3 2026 — Launch & First Revenue

### Payments Go Live

| Milestone | Timeline | Dependencies |
|---|---|---|
| ICP备案 approval | July 2026 | Filing submitted |
| WeChat Pay 商户号 activation | July 2026 | ICP备案 approved |
| WeChat Pay webhook integration | July 2026 | 商户号 active |
| Payment flow E2E testing | July–Aug 2026 | Webhook working |
| First paying customer transaction | Aug 2026 | All above |

### Content: Wave 1 Subject Packs

| Pack | Nodes | Status |
|---|---|---|
| 高考语文古诗文72篇 | ~150 nodes | Not started |
| 人教版高中数学 必修1 | ~100 nodes | Not started |

### Marketing Kickoff

- [ ] Record first 视频号 video (45s Chinese — script ready, Task 18)
- [ ] Post to 视频号 + cross-post to 小红书
- [ ] A/B test video hooks
- [ ] Target: 10 paying users by end of Q3

### Platform Polish

- [ ] Onboarding flow (2-tap: subject → textbook → load graph)
- [ ] Subject pack selector in dashboard
- [ ] First-month promo pricing (¥9.9/month)

---

## Q4 2026 — Soft Launch & Growth

### Content: Wave 2 Subject Packs

| Pack | Nodes |
|---|---|
| 部编版初中语文 7–9年级 | ~200 nodes |
| 人教版高中数学 必修2–5 + 选择性必修 | ~300 nodes |

### Revenue Targets

- **100 paying users** → ~¥1,900 MRR
- Break-even: ~80 paying users (covers server + payment fees)

### Infrastructure

- [ ] CI/CD pipeline (GitHub Actions: tsc, lint, test on push)
- [ ] Automated deployment workflow (git push → PM2 reload)
- [ ] Performance optimization for knowledge graph rendering (>200 nodes)

### Marketing

- [ ] 10–15 视频号 videos with A/B tested hooks
- [ ] Community building: WeChat group for power users
- [ ] Referral program design (老学员 referral → ¥20 discount)

---

## Q1 2027 — BullMQ + Redis Migration

### Job Queue Upgrade

| Component | Current | Target |
|---|---|---|
| Queue Engine | In-process polling (5s) | BullMQ + Redis |
| Concurrency | Single worker | Multi-worker (configurable) |
| Retry Logic | Manual reclaim | BullMQ built-in retry with backoff |
| Job Persistence | SQLite | Redis (queue) + SQLite (results) |
| Monitoring | pino logs | Bull Board dashboard |

### Benefits

- **Reliability**: Redis-backed queue survives process crashes without data loss
- **Scalability**: Multiple workers can process jobs in parallel
- **Observability**: Built-in dashboard for queue depth, throughput, failure rates
- **Stale job recovery**: Redis TTL-based stale detection (no custom polling)

### Database Evaluation

- Evaluate PostgreSQL migration for multi-user concurrency
- Decision criteria: user count, write contention, query complexity
- SQLite may remain viable below 1,000 concurrent users

---

## Q2 2027 — iOS App (TBD)

### WeChat Mini Program vs Native iOS

| Option | Pros | Cons |
|---|---|---|
| WeChat Mini Program | Low friction, native WeChat Pay, instant access | Limited to WeChat ecosystem, API restrictions |
| Native iOS (Swift/SwiftUI) | Full platform control, App Store distribution | Higher dev cost, separate codebase, Apple IAP fees |

**Decision deferred** until Q1 2027 based on user platform data.

### Prerequisites for Mobile

- [ ] All core features accessible via REST API (mobile-ready)
- [ ] Push notification service (SM-2 review reminders)
- [ ] Mobile-optimized auth flow (WeChat login integration)

---

## Q3–Q4 2027 — Scale to 1,000+ Paid Users

### Content Expansion

| Category | Packs |
|---|---|
| 高考数学 | 人教版全套 (~500 nodes) |
| 高考英语 | Different AI pipeline needed |
| 小学语数 | Parent-paid segment |

### Enterprise/Institution Features

- [ ] School/organization accounts with admin dashboard
- [ ] Bulk student import
- [ ] Class-level analytics
- [ ] Custom subject pack creation for teachers

### Revenue Targets

- 500 paying users → ~¥9,500 MRR
- 1,000 paying users → ~¥19,000 MRR

### Platform Maturity

- [ ] PostgreSQL migration (if SQLite limits reached)
- [ ] Redis caching layer (sessions, quota counters, rate limits)
- [ ] CDN for frontend static assets
- [ ] Regional deployment for lower latency
- [ ] Automated scaling (PM2 cluster → containerized deployment)

---

## Long-Term Vision (2028+)

### AI Enhancements

- Fine-tuned models for Chinese education domain
- Multi-modal input: handwritten notes, audio lectures
- Real-time collaborative knowledge graph editing
- AI-powered study plan generation with progress tracking

### Platform Expansion

- English/International curriculum support (IB, AP, A-Levels)
- Peer-to-peer knowledge sharing (public graph marketplace)
- Integration with school LMS systems
- Offline-first mobile experience

### Monetization Evolution

- Family plans (parent + 1–2 students, +¥50/yr each)
- Institution licensing (per-student pricing)
- Content marketplace (teacher-created subject packs)
- API access for third-party education apps

---

## Parking Lot (Ideas Without Timeline)

These are recorded for future consideration but not currently scheduled:

- **Dark mode for PDF exports** — student-friendly night study
- **Gamification**: streaks, badges, leaderboards
- **Voice input for chat** — useful for younger students
- **AR knowledge graph** — visual overlay for physical textbooks
- **Integration with 百度网盘** — direct file import
- **Video tutorial generation** — AI-generated lesson videos from graph nodes

---

**Last updated:** 2026-07-12

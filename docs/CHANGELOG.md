# Changelog

> All notable changes to the OCR Knowledge Base Matcher.
> Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- WeChat Pay live integration with webhook handling
- Subject packs: 高考语文古诗文72篇 + 人教版高中数学 必修1
- Pricing page with tier comparison and payment flow
- First 视频号 marketing video
- ICP备案 + WeChat Pay 商户号 application

---

## [1.0.0-beta] — 2026-07-12

### Added
- **Subscription tier system** (free, monthly, yearly) with per-resource quota enforcement
- **SQLite database migration** — 13 tables replacing JSON file storage (better-sqlite3, WAL mode)
- **Atomic job claiming** via `UPDATE ... RETURNING *` — eliminates TOCTOU race condition
- **Free trial system** (7 days) with abuse prevention (email + device fingerprint, 90-day cooldown)
- **Admin audit log** (SQLite-persisted) — tier/role changes tracked with before/after snapshots
- **Circuit breaker** for Moonshot API (opossum) — 50% error threshold, 30s reset
- **Sentry error monitoring** — conditional init, all unhandled errors captured
- **Server-side upload size cap** — two-layer enforcement (multer + tier-based route check)
- **Structured logging** via pino (replaced all `console.*` calls)
- **brute-force login protection** — progressive delays (1s, 5s) + 1-hour lockout at 10 attempts
- **JWT token revocation** — in-memory JTI tracking, dev-friendly fallbacks
- **Daily database backups** — PowerShell + Bash scripts with cloud upload (Aliyun OSS / AWS S3)
- **UptimeRobot monitoring guide** — health endpoint configuration
- **Legal pages** (frontend): Terms of Service, Privacy Policy (PIPL-compliant), Refund Policy (7-day)
- **Pricing page** (frontend) — tier preview with email capture
- **Landing page** — Chinese marketing copy with hero, features grid, how-it-works
- **Jest test suite** — 57 billing-critical tests (quota, auth, admin, user service)
- **Marketing video script + storyboard** — 45s Chinese video for 视频号 (Task 18)
- **Comprehensive documentation** — 11 docs covering all product logic and usage

### Changed
- **userService.ts** migrated from JSON files to SQLite (`better-sqlite3`)
- **knowledgeGraphStorage.ts** migrated from JSON files to SQLite (per-user isolation via `user_id`)
- **jobService.ts** migrated from JSON files to SQLite; `claimJob` now atomic with `workerId`
- **reviewService.ts** migrated from JSON files to SQLite
- **queueProcessor.ts** uses `reclaimStaleJobs()` for atomic stale job recovery
- **quota.ts** lazy tier downgrade + period rollover logic updated for paid tiers
- **upload.ts** route now enforces tier-based file size limits
- **admin.ts** API now writes audit log entries on tier/role changes
- **auth.ts** added `tier?` and `role?` fields to `AuthenticatedUser`
- **errorHandler.ts** integrated Sentry error capture
- **ai.ts** all `console.*` calls replaced with `logger.*`
- **QuotaExceededHandler.tsx** toast link changed from `/admin` to `/settings/subscription`
- **tiers.ts** added `maxFileSizeMB` to `TIER_LIMITS`
- Landing page rewritten with Chinese marketing copy

### Fixed
- `setUserTier` now sets `subscriptionStartedAt` and resets `usage.periodStart` for paid tiers
- 429 quota exceeded toast no longer links to admin-only page (fixed to `/settings/subscription`)
- `subscriptionStartedAt` field added to `User` type (eliminated `as unknown as` double-cast)
- `tier?: string` added to `AuthenticatedUser` interface (fixed upload.ts tsc error)
- `pep-talks.json` created to fix pre-existing dev server 500 on dashboard
- LightningCSS Linux binary removed from `package.json` (was blocking Windows install)

### Removed
- `@anthropic-ai/sdk` dead dependency identified (zero usages, still in `package.json`)
- `_qa_task4.ts` stray QA file removed

---

**Format**: Based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

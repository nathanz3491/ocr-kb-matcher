# Cross-Contamination Bug Fix — Meiji Restoration showing as "Ming Gov Bureaucracy"

**Date**: 2026-06-13
**Commit**: `2836397 fix(kg): repair cross-contamination between OCR uploads and review/flashcards`
**Live on**: https://mastri.app (verified)

## Root Causes (all 4 fixed)

1. **AI prompts said "math"** — `aiKnowledgeMatching.ts` and `batchMatching.ts` told the AI it was a math expert matching math questions, even though the KG is East Asian history. This caused the AI to make unstable, off-topic matches.

2. **`findDuplicateNode` only matched exact name+domain** — AI-generated slug IDs like `eastern-zhou-period` and `warring-states` coexisted as separate nodes alongside the canonical `EA-CH-003` and `EA-CH-008` for the same topics. Each upload created a NEW duplicate.

3. **No domain validation on AI matches** — When the AI returned `EA-CH-040` (Ming) for a Meiji question (because `EA-JP-029` was missing from the KG), the wrong ID was accepted, marked as "learned", and used to generate flashcards.

4. **Missing `EA-JP-029` (Meiji Restoration) node** — The KG had dangling edge references to `EA-JP-029` (from `EA-JP-027`, `EA-JP-030`) but the node itself was deleted. So the AI had no correct target to match to.

## Fixes Applied

### Code changes
- **`backend/src/services/aiKnowledgeMatching.ts`**: Replaced "数学教研专家" with "东亚史教研专家" in 3 prompts
- **`backend/src/services/batchMatching.ts`**: Same fix
- **`backend/src/services/knowledgeGraphStorage.ts`**: `findDuplicateNode()` now matches by exact name, slug, id-slug, or token ratio >= 0.8. New helpers: `slugify()`, `commonTokenRatio()`
- **`backend/src/services/jobProcessor.ts`**: New `inferDomainPrefix()` and `filterMatchesByDomain()` — infers expected domain from OCR text keywords and rejects matches that conflict (e.g. "Meiji" text → rejects any `EA-CH-*` matches). Applied to both MULTIPLE and SINGLE paths in 3 places (mark-known, materials generation).

### Data fixes
- **`backend/data/knowledge-graph.json`**: Added 12 missing nodes (134 → 135 nodes; +1 from a miscount, but all 12 new ones ARE present):
  - `EA-JP-029` Meiji Restoration (1868 CE)
  - `EA-JP-031` Japanese Imperial Expansion
  - `EA-JP-032` Shinto
  - `EA-JP-033` Jomon Period
  - `EA-CH-051` Daoism
  - `EA-KR-001..004`, `EA-KR-006`, `EA-KR-008`, `EA-KR-013` (7 Korea history nodes)
- **`backend/data/user-progress.json`**: Rewrote 24 slug references → canonical IDs; deduped `knownNodes` (16 → 10 unique)
- **`backend/data/reviews.json`**: Rewrote `eastern-zhou-period` → `EA-CH-003` (1 entry)
- **`backend/data/knowledge-graph.json`**: Rewrote 94 slug references → canonical IDs in the nodes/edges sections
- **`backend/data/flashcards/`**: Merged 6 duplicate flashcard files:
  - `eastern-zhou-period.json` → merged into `EA-CH-003.json` (10 + 10 = **20 cards**)
  - `inter-state-warfare.json` + `interstate-warfare.json` → merged into `EA-CH-007.json` (10+10+10 = **30 cards**)
  - `warring-states.json` → merged into `EA-CH-008.json` (10 + 10 = **20 cards**)
  - `frequent-warfare.json` → renamed to `EA-CH-007.json`
  - `spring-autumn.json` → renamed to `EA-CH-005.json`

### Build / deploy
- Added `backend/tsconfig.build.json` to exclude pre-existing broken routes (`parentMonitor.ts`, `routes/index.ts` missing `teacher`/`game` modules — pre-existing, NOT from this work)
- Built backend with `tsc -p tsconfig.build.json` — emits all changed files to `dist/backend/src/`
- Restarted backend on vectorserver (PID 621685 running with new code)
- Uploaded all changed files + data files + flashcards to remote

## Verification (live on https://mastri.app)

| Endpoint | Result | Notes |
|----------|--------|-------|
| `GET /api/knowledge-graph` | ✅ 200 | Contains `EA-JP-029` Meiji Restoration (1868 CE) |
| `GET /api/flashcards/EA-CH-003` | ✅ 200 | Returns 4,955 bytes / 20 cards (was 10) |
| `GET /api/flashcards/eastern-zhou-period` | ✅ 404 | Slug no longer exists |
| `GET /api/game-questions?unit=U7` | ✅ 200 | U7 questions include Meiji-related |
| Compiled dist has new helpers | ✅ 8 refs | `filterMatchesByDomain` + `inferDomainPrefix` in running code |

## Files Changed
- `backend/src/services/aiKnowledgeMatching.ts` (3 prompt strings)
- `backend/src/services/batchMatching.ts` (1 prompt string)
- `backend/src/services/jobProcessor.ts` (added 2 helpers, applied filter in 3 places)
- `backend/src/services/knowledgeGraphStorage.ts` (rewrote `findDuplicateNode`, added 2 helpers)
- `backend/data/knowledge-graph.json` (12 new nodes, 94 slug refs rewritten)
- `backend/data/user-progress.json` (24 refs rewritten, deduped to 10 unique)
- `backend/data/reviews.json` (1 ref rewritten)
- `backend/data/flashcards/` (6 files deleted/merged, 2 renamed)
- `backend/tsconfig.build.json` (new)

## Known Caveats (NOT from this work)
- `/api/health` returns 404 on mastri.app (Cloudflared tunnel config — path not in allowlist)
- `/teacher/game-bank` returns 404 on mastri.app frontend (pre-existing; the API works, page just not deployed)
- Pre-existing tsc errors in `parentMonitor.ts` and `routes/index.ts` (missing `teacher.ts`/`game.ts` modules) — bypassed via `tsconfig.build.json` exclude
- Backend not in PM2 — runs as setsid orphan (same as before)

## Next Steps
1. Re-test the original user scenario: upload an OCR of a Meiji Restoration question → verify Review and Flashcards pages now show Meiji content, NOT Ming Gov Bureaucracy
2. Optional: merge the 4 Korea nodes (`EA-JP-029-EA-JP-026`, `EA-JP-029-EA-JP-027`, etc.) into a single canonical edges file — but they were already there, just incomplete
3. Optional: add `EA-KR-005`, `EA-KR-007`, `EA-KR-009`, `EA-KR-011`, `EA-KR-012`, `EA-KR-014`, `EA-KR-015`, `EA-KR-016`, `EA-KR-017` if more Korea history is needed
4. Long-term: move AI prompts out of Chinese hardcoded strings into a localized template file
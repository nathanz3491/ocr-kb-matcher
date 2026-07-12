# Parent-Monitor Compliance Decision

## Decision: DISABLE for MVP

**The `parent-monitor` feature is disabled for the MVP launch.**

## Rationale

### Legal Risk: PIPL Article 31

China's Personal Information Protection Law (PIPL), Article 31, requires **explicit parental consent** before collecting or processing personal information of minors under 14. The parent-monitor feature necessarily involves:

- Accessing a minor student's learning data (knowledge graph, quiz results, review progress)
- Displaying personally identifiable information (student name, email)
- Enabling a parent account type with elevated visibility into a child's account

### Current Implementation Gaps

The current code (functional but incomplete) does NOT provide:

1. **Explicit parental consent flow** — no signed consent mechanism (digital signature or check box)
2. **Separate parent account type enforcement** — `accountType === 'parent'` is checked but the registration/consent flow is not fully gated
3. **Audit logging of parent accesses** — no per-access audit trail for parent-viewed student data
4. **Data export/deletion guarantee** — children's data must be deletable on parent request (already in Wave 4 plan, but not wired to parent-monitor)

### Complexity vs. MVP Goals

The core OCR/AI value proposition (document upload → knowledge graph → flashcards/quizzes) is independent of parent-monitor. Shipping this feature prematurely risks:

- Compliance fines (up to 5% of annual revenue under PIPL)
- User trust erosion if children's data is exposed without proper safeguards
- Engineering distraction during MVP stabilization

## Path to Re-enable (Future Release)

When ready to ship parent-monitor, the following changes are required:

| Requirement | Implementation |
|---|---|
| Explicit parental consent flow | Digital signature or checkbox with timestamped record stored in `audit_log` + `consent_records` table |
| Separate parent account type | `ParentAccount` interface extending `User` with consent fields, dedicated registration flow |
| Audit log of all parent access | Every `GET /api/parent-monitor/*` call logged to `audit_log` with `parentId`, `studentId`, `action`, `timestamp` |
| Data export and deletion | Already in Wave 4 plan (`GET /api/data/export`, `DELETE /api/data/account`) — wire to parent-managed deletion |
| Rate limiting | Separate stricter rate limit for parent-monitor endpoints (prevent scraping) |
| Notification to student | Child should be notified when parent views their data (email or in-app) |

## What Was Changed

1. **`backend/src/routes/parentMonitor.ts`**: All requests return HTTP 503 with a clear disabled message. Existing route code is preserved for future re-enable.
2. **`frontend/app/parent-monitor/page.tsx`**: Replaced full dashboard UI with a "temporarily disabled" notice. Page file preserved.
3. **`frontend/components/navigation/Navigation.tsx`**: Parent-monitor nav link removed (even for parent account type).

No files were deleted. The feature is compile-time disabled — re-enabling requires removing the early-return middleware in the route handler and unhiding the nav link.

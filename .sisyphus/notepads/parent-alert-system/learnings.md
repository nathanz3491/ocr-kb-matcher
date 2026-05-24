# Parent Alert System — Learnings

## T1: ParentAlert types added to shared/types.ts
Types added at lines 348-393 of shared/types.ts:
- ParentAlertType, ParentAlertSeverity, ParentAlert, ParentAlertSettings, ParentAlertDigest, ParentAlertStudentDigest
- All exported correctly, tsc build passes clean

## T3: Off-topic detection wired into jobProcessor.ts

### Files Modified
- `backend/src/services/jobProcessor.ts` — Added `trackOffTopicJob()` helper + detection in 4 pipeline branches
- `shared/types.ts` — Added `offTopic?: boolean` and `matchConfidence?: number` to `Job` interface

### Key Decisions
- **Threshold: confidence < 0.3** — If ALL matched nodes have confidence below 0.3 (or no matches at all), the upload is flagged as off-topic
- **Confidence comes from `AIMatchResult.confidence`** (aiKnowledgeMatching.ts), which is a 0-1 float from Moonshot AI
- **Tracking file**: `backend/data/off-topic-jobs-{studentId}.json` — append-only, keeps latest 20 entries
- **Atomic write pattern**: Copied from knowledgeGraphStorage.ts (temp file + rename)
- **4 pipeline branches covered**: SINGLE, WRONG_SINGLE, WRONG_MULTIPLE, MULTIPLE — each computes average confidence across all matched nodes

### Fields Added to Job
- `offTopic: boolean` — true when no matches or all confidences < 0.3
- `matchConfidence: number` — average confidence rounded to 2 decimal places (0-1)

### Tracking File Format
```json
[
  {
    "jobId": "job-abc123",
    "studentId": "student-xyz",
    "timestamp": "2026-05-21T13:00:00.000Z",
    "confidence": 0.15
  }
]
```

### Build Verification
- Added `offTopic` and `matchConfidence` to shared `Job` type → tsc passes clean
- Backend restarted via PM2 after build

## T5: Parent email templates added to emailService.ts

### Changes Made
- Appended to ackend/src/services/emailService.ts:
  - sendEmail() �� generic SMTP helper (wraps nodemailer, returns {success, messageId})
  - sendParentAlertEmail() �� real-time alert email with severity badge, student name, alert card
  - sendParentDigestEmail() �� daily digest with per-student cards, alert summaries, review counts
  - escapeHtml() �� HTML entity escaping helper
  - ormatTimeAgo() �� relative time formatting helper

### Fixes Applied to Make Build Pass
- **Pre-existing fix**: parentAlertRoutes.ts line 9 �� changed 
ext: Function to 
ext: NextFunction and imported NextFunction`n- **Pre-existing fix**: Created parentNotificationService.ts with sendDailyDigestForParent() to resolve missing module import in parentAlertRoutes.ts`n- **New addition**: Added sendEmail() helper function since the template code calls it but it didn't exist in the file

### Build Verification
- 
pm run build exits 0 cleanly
- sendParentAlertEmail at line 270, sendParentDigestEmail at line 371
- File grows from original to 513 lines

## T7: Digest timer added to index.ts

### Changes Made
- **File**: `backend/src/index.ts` (155 lines after patch)
- Added import: `sendDailyDigest` from `parentNotificationService`
- Added constants: `PARENT_DIGEST_HOUR_UTC` (default 9), `PARENT_DIGEST_ENABLED` (default true)
- Added functions: `triggerDigest()`, `startParentDigestTimer()`, `stopParentDigestTimer()`
- Timer pattern: `setTimeout` for first fire → `setInterval(24h)` for subsequent fires
- `startParentDigestTimer()` called after queue polling starts
- `stopParentDigestTimer()` called in graceful shutdown before `server.close()`

### Key Decisions
- **First-fire approach**: Calculate ms until next N:00 UTC, use `setTimeout` once, then switch to `setInterval`
- **Disabled via env**: `PARENT_DIGEST_ENABLED=false` skips timer entirely (no console spam)
- **Graceful shutdown**: Both `clearTimeout` and `clearInterval` called, nulled out variables

### Build Verification
- `npm run build` exits 0 cleanly
- No new TypeScript errors introduced



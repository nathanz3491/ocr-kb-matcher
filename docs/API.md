# API Reference

> REST API documentation for the OCR Knowledge Base Matcher backend.
> Base URL: `http://localhost:3001` (dev) or your production domain.

---

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_access_token>
```

### Token Lifecycle

- **Issue**: `POST /api/auth/login` or `POST /api/auth/register`
- **Refresh**: `POST /api/auth/refresh` (requires refresh token)
- **Revoke**: `POST /api/auth/logout` (adds token JTI to revocation list)

### Auth Middleware

| Middleware | Behavior |
|---|---|
| `optionalAuth` | Extracts `userId` if valid token present; allows guest access. Applied globally in `app.ts`. |
| `requireAuth` | Returns 401 if no valid token. Applied per-route on protected endpoints. |
| `requireAdmin` | Returns 403 if user is not admin. Applied on admin routes. |

### Error Responses

All endpoints return JSON with shape:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message (Chinese for users)"
}
```

Standard HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 413 (Payload Too Large), 429 (Too Many Requests), 500 (Internal Server Error).

---

## Auth Endpoints

### `POST /api/auth/register`

Register a new user account.

**Auth**: None (public)

**Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "accountType": "student"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "user@example.com", "accountType": "student", "tier": "free" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Errors**: 400 (invalid email/password), 403 (trial abuse detected), 409 (email already registered)

---

### `POST /api/auth/login`

Authenticate and receive tokens.

**Auth**: None

**Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "accountType": "student", "tier": "free" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Errors**: 401 (invalid credentials), 429 (account locked, retry-after in seconds)

---

### `POST /api/auth/refresh`

Refresh an expired access token.

**Auth**: None (uses refresh token in body)

**Body**:
```json
{
  "refreshToken": "..."
}
```

### `POST /api/auth/logout`

Revoke the current access token.

**Auth**: Bearer token

### `GET /api/auth/me`

Get current user profile.

**Auth**: Bearer token

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "accountType": "student",
    "tier": "free",
    "usage": { "periodStart": "...", "uploads": 0, "quizGenerated": 0, "chatMessages": 0 },
    "subscriptionExpiresAt": null
  }
}
```

### `POST /api/auth/verify-email`

Verify email with token from registration email.

**Auth**: None

**Body**:
```json
{
  "token": "..."
}
```

---

## Upload Endpoints

### `POST /api/upload`

Upload a document for processing.

**Auth**: Bearer token (requireAuth)

**Content-Type**: `multipart/form-data`

**Body**: `file` field (PDF, PNG, JPEG, WebP, DOCX)

**Response** (201):
```json
{
  "success": true,
  "data": {
    "jobId": "...",
    "status": "pending",
    "fileName": "document.pdf"
  }
}
```

**Errors**: 400 (invalid file type), 413 (file exceeds tier size limit), 429 (quota exceeded)

---

## Job Endpoints

### `GET /api/jobs/:jobId`

Get job status and results.

**Auth**: Bearer token

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "completed",
    "type": "document_processing",
    "fileName": "document.pdf",
    "results": { "nodesCreated": 12, "edgesCreated": 8 },
    "createdAt": "...",
    "completedAt": "..."
  }
}
```

### `GET /api/jobs`

List jobs for the current user.

**Auth**: Bearer token

**Query Params**: `?status=processing&limit=20`

---

## Knowledge Graph Endpoints

### `GET /api/knowledge-graph/nodes`

List all nodes in the user's knowledge graph.

**Auth**: Bearer token

### `POST /api/knowledge-graph/nodes`

Create a new node.

**Auth**: Bearer token

**Body**:
```json
{
  "title": "Spring and Autumn Period",
  "content": "A significant era in Chinese history...",
  "category": "history",
  "keywords": ["Zhou dynasty", "Chinese history"]
}
```

### `PUT /api/knowledge-graph/nodes/:nodeId`

Update a node.

**Auth**: Bearer token

### `DELETE /api/knowledge-graph/nodes/:nodeId`

Delete a node.

**Auth**: Bearer token

### `POST /api/knowledge-graph/relationships`

Create a relationship between two nodes.

**Auth**: Bearer token

**Body**:
```json
{
  "fromId": "node-1",
  "toId": "node-2",
  "type": "preceded_by"
}
```

### `GET /api/graph-editor/`

Graph editor endpoints (rename, merge, etc.).

### `GET /api/knowledge-tree/`

Get knowledge tree structure for export to LLM.

---

## Quiz Endpoints

### `POST /api/quiz/generate/:jobId`

Generate a quiz from a processed job.

**Auth**: Bearer token (quota-enforced: `quizGenerated`)

**Response** (201):
```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "question": "What year...",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
      }
    ]
  }
}
```

### `POST /api/quiz/submit/:sessionId`

Submit quiz answers.

**Auth**: Bearer token

**Body**:
```json
{
  "answers": [
    { "questionId": "q1", "answer": "B" }
  ]
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "score": 8,
    "total": 10,
    "results": [
      { "questionId": "q1", "correct": true, "correctAnswer": "B" }
    ]
  }
}
```

---

## Flashcard Endpoints

### `POST /api/flashcards/generate/:nodeId`

Generate flashcards for a knowledge graph node.

**Auth**: Bearer token

### `GET /api/flashcards/`

List all flashcards for the current user.

**Auth**: Bearer token

### `PUT /api/flashcards/:cardId`

Update a flashcard (e.g., after review).

**Auth**: Bearer token

### `DELETE /api/flashcards/:cardId`

Delete a flashcard.

**Auth**: Bearer token

---

## Study Material Endpoints

### `POST /api/study/cheat-sheet/:nodeId`

Generate a cheat sheet for a node.

**Auth**: Bearer token

### `POST /api/study/notes/:nodeId`

Generate study notes for a node.

**Auth**: Bearer token

---

## Review Endpoints (SM-2)

### `GET /api/reviews/due`

Get flashcards due for review (SM-2 algorithm).

**Auth**: Bearer token

### `POST /api/reviews/submit`

Submit a review result.

**Auth**: Bearer token

**Body**:
```json
{
  "cardId": "...",
  "quality": 4
}
```

---

## Chat Endpoints

### `POST /api/chat`

Send a chat message.

**Auth**: Bearer token (quota-enforced: `chatMessages`)

**Body**:
```json
{
  "message": "Explain the Pythagorean theorem",
  "contextNodeIds": ["node-1"]
}
```

### `GET /api/chat`

Get chat history.

**Auth**: Bearer token

---

## Wrong Questions Endpoints

### `GET /api/wrong-questions/`

List wrong questions from quiz sessions.

**Auth**: Bearer token

### `POST /api/wrong-questions/review`

Start a wrong-question review session.

**Auth**: Bearer token

---

## Admin Endpoints

All admin endpoints require `requireAdmin` middleware.

### `GET /api/admin/users`

List all users.

**Auth**: Bearer token (admin)

### `PATCH /api/admin/users/:userId/tier`

Update a user's subscription tier.

**Auth**: Bearer token (admin)

**Body**:
```json
{
  "tier": "monthly",
  "subscriptionExpiresAt": "2026-08-12T00:00:00.000Z"
}
```

**Audit**: Writes to `audit_log` table (state snapshot before/after).

### `PATCH /api/admin/users/:userId/role`

Update a user's role (user ↔ admin).

**Auth**: Bearer token (admin)

### `GET /api/admin/stats`

Get aggregate platform statistics.

**Auth**: Bearer token (admin)

### `GET /api/admin/audit-log`

Get admin action audit log.

**Auth**: Bearer token (admin)

**Query Params**: `?userId=X&action=tier_update&limit=50`

---

## User / Quota Endpoints

### `GET /api/user/quota`

Get current user's quota usage and limits.

**Auth**: Bearer token

**Response** (200):
```json
{
  "success": true,
  "data": {
    "tier": "free",
    "usage": { "uploads": 1, "quizGenerated": 0, "chatMessages": 5 },
    "limits": { "uploads": 2, "quizGenerated": 3, "chatMessages": 20 },
    "periodStart": "2026-07-01T00:00:00.000Z",
    "resetsAt": "2026-08-01T00:00:00.000Z"
  }
}
```

### `PUT /api/user/settings`

Update account settings (password, email notifications).

**Auth**: Bearer token

---

## Analytics Endpoints

### `GET /api/analytics/overview`

Get study analytics overview.

**Auth**: Bearer token

---

## Subject Endpoints

### `GET /api/subjects/`

List available subject packs.

**Auth**: Bearer token

### `POST /api/subjects/:subjectId/load`

Load a subject pack into the user's knowledge graph.

**Auth**: Bearer token

---

## Parent Monitor Endpoints

### `POST /api/parent-monitor/link`

Generate a parent-student link code.

**Auth**: Bearer token (parent account)

### `POST /api/parent-monitor/join`

Join a parent monitor using a link code.

**Auth**: Bearer token (student account)

---

## Rate Limiting

- **General**: 300 requests per minute per IP (skips `/health`)
- **Auth**: Stricter limits on login/register (brute-force protection)
- **Upload**: Stricter limits to prevent abuse
- **429 Response**:
```json
{
  "success": false,
  "error": "QUOTA_EXCEEDED",
  "resource": "uploads",
  "quota": { "used": 2, "limit": 2, "tier": "free", "resetsAt": "..." },
  "message": "本月上传额度已用完（2/2）。升级套餐获取更多额度。"
}
```

---

## Health Check

### `GET /health`

Public health check, no auth required.

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-07-12T00:00:00.000Z",
  "service": "ocr-kb-matcher-backend",
  "version": "1.0.0",
  "environment": "production"
}
```

### `GET /`

API root — returns available endpoints listing.

---

**Last updated:** 2026-07-12

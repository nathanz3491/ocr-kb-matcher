# Security

> Security architecture, controls, and compliance for the OCR Knowledge Base Matcher.

---

## Authentication

### Password Handling

- Passwords hashed with **bcryptjs** (12 rounds, salt auto-generated)
- Constant-time comparison: dummy hash used when email doesn't exist, preventing user enumeration via timing attacks
- `DUMMY_PASSWORD_HASH` exported from `auth.ts` for use in login handler

### JWT Tokens

- Access tokens signed with `JWT_SECRET` (HMAC-SHA256)
- Refresh tokens signed with `JWT_REFRESH_SECRET`
- Token revocation: JTI (JWT ID) added to in-memory revocation set on logout
- Dev fallback: missing/revoked tokens treated as guest in non-production environments (for developer convenience)

### Dev Mode Fallbacks

In `NODE_ENV !== 'production'`:

| Scenario | Behavior |
|---|---|
| No auth header | Continue as guest (`next()` without setting `req.user`) |
| Revoked token | Continue as guest |
| Invalid/expired token | Continue as guest |

These fallbacks **never fire in production**.

---

## Brute-Force Protection

Login attempts tracked per email via in-memory `Map<email, LoginAttemptEntry>`:

| Attempts | Action |
|---|---|
| 3rd attempt | 1-second delay |
| 5th attempt | 5-second delay |
| 10th attempt | **1-hour lockout** + Sentry warning |

Successful login clears the attempt counter. Stale entries (>24h no activity) cleaned up every 10 minutes.

---

## Free Trial Abuse Prevention

Implemented in `trialGuard.ts` with SQLite-backed `trial_attempts` table.

### Trial Rules

| Check | Rule |
|---|---|
| Email (active trial) | Same email with `expires_at > now` → blocked |
| Email (recent trial) | Same email with trial started within 90 days → blocked |
| Device fingerprint (active) | Same SHA-256(userAgent + acceptLanguage) with active trial → blocked |
| Device fingerprint (recent) | Same fingerprint with recent trial → blocked |
| Old expired trial | >90 days since start → allowed |

### Abuse Logging

If ≥3 trial attempts from same email/fingerprint within 24h, logs via `logger.warn` with `[ABUSE]` prefix. Sentry integration can be added later.

---

## Quota Enforcement

### Per-Resource Caps

Enforced by `enforceQuota()` middleware in `quota.ts`:

| Resource | Free | Monthly | Yearly |
|---|---|---|---|
| Uploads | 2/mo | 15/mo | 15/mo |
| Quiz Generated | 3/mo | 30/mo | 30/mo |
| Chat Messages | 20/mo | 100/mo | 100/mo |
| Max File Size | 20 MB | 100 MB | 100 MB |

### Enforcement Flow

1. Always re-read user from DB (never trust in-memory cache)
2. Lazy tier downgrade (if `subscriptionExpiresAt < now` → downgrade to free)
3. Period rollover check via `isCurrentPeriod()`
4. If `used >= limit` → 429 with Chinese message + `resetsAt`
5. If under limit → increment counter, persist, continue

### Known Limitation

Concurrent requests from the same user may temporarily exceed quota by 1–2 operations before counters stabilize. This is an accepted trade-off for single-process SQLite storage without row-level locking.

---

## Upload Security

### File Validation

- Magic byte validation via `validateImage()` in `ocr.ts`
- Multer `limits.fileSize` = `MAX_UPLOAD_SIZE_MB` env var (default 50MB) — absolute server cap
- **Two-layer size enforcement**:
  - Layer 1: Multer hard cap (50MB server-wide)
  - Layer 2: Route handler checks against `TIER_LIMITS[tier].maxFileSizeMB`
- Allowed formats: PDF, PNG, JPEG, WebP, DOCX

### Path Sanitization

Uploaded files saved with sanitized filenames in `backend/uploads/`. Path traversal prevented by multer's built-in filename handling and OCR service path sanitization.

---

## Cross-Origin Resource Sharing (CORS)

Configured in `app.ts`:

- **Allowed origins**: `CORS_ORIGIN` env var (comma-separated) + `*.trycloudflare.com` regex
- **Credentials**: Enabled (supports cookies if needed)
- **Production**: Locked to specific domain(s)
- **Development**: `http://localhost:3000`

---

## Security Headers

Helmet.js applied globally in `app.ts` (before CORS):

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS, production only)

---

## Rate Limiting

| Limiter | Scope | Rate | Applied To |
|---|---|---|---|
| `generalLimiter` | Per IP | 300 req/min | All routes (skips `/health`) |
| `authLimiter` | Per IP | Stricter | Login, register |
| `uploadLimiter` | Per IP | Stricter | File upload |

Rate limiters use `express-rate-limit`.

---

## Admin Actions

### Access Control

- `requireAdmin` middleware checks `req.user.role === 'admin'` OR email in `ADMIN_EMAILS` env var
- Admin routes gated at router level

### Audit Logging

All admin actions logged to `audit_log` table:

| Action | Details |
|---|---|
| `tier_update` | `{ before: { tier: 'free' }, after: { tier: 'monthly' } }` |
| `role_update` | `{ before: { role: 'user' }, after: { role: 'admin' } }` |

Audit entries include: `adminId`, `targetUserId`, `action`, `details` (JSON), `timestamp`.

Audit write failures do **not** block the admin action — logged silently to prevent audit issues from affecting user management.

---

## Webhook Security (WeChat Pay)

### Idempotency

Webhook events written to `webhook_events` table with unique `event_id`. Duplicate events detected via primary key conflict and silently ignored.

### Webhook Signature Validation

WeChat Pay callbacks include HMAC-SHA256 signatures. Validation to be implemented when payment integration goes live.

---

## Data Privacy

### User Data Isolation

All user data isolated via `user_id` column in all tables. No cross-user data access possible through normal API operations.

### PIPL (Personal Information Protection Law)

Key compliance measures:

- **Data minimization**: Only email and account type collected at registration
- **Purpose limitation**: Data used only for platform functionality
- **User consent**: Registration implies consent; legal pages explain data usage
- **Right to access**: User can view their data via API
- **Right to deletion**: Admin can delete user data on request

### GDPR Considerations

For any EU users:
- Legal pages available at `/legal/privacy`
- Data export available via settings
- Account deletion available on request to admin

---

## Circuit Breaker (AI API)

Moonshot AI calls protected by `opossum` circuit breaker:

| Setting | Value |
|---|---|
| Timeout | 30s (counts slow calls as failures) |
| Error threshold | 50% |
| Reset timeout | 30s |
| Volume threshold | 5 (min calls before breaker evaluates) |

When circuit is open, jobs fail gracefully with "Moonshot API unavailable" status. Circuit events logged to pino for Sentry alerting.

---

## Known Gaps

| Gap | Severity | Plan |
|---|---|---|
| SQLite single-writer bottleneck | Medium | PostgreSQL migration (Q3) |
| In-memory token revocation | Low | Redis in Wave 4 |
| No input sanitization library | Low | Add DOMPurify for user content |
| Quota race condition | Low | Accepted trade-off (documented) |
| No CSRF protection for cookie-based auth | Low | Currently JWT-only (Bearer header), CSRF not applicable |

---

**Last updated:** 2026-07-12

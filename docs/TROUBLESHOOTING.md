# Troubleshooting Guide

> Common issues, their causes, and resolution steps for the OCR Knowledge Base Matcher.

---

## Backend Issues

### ❌ Backend Won't Start

**Symptoms**: `npm run dev` fails, process exits immediately.

**Possible Causes & Fixes**:

1. **Missing `.env` file**
   ```bash
   cp backend/.env.example backend/.env
   # Edit with your MOONSHOT_API_KEY
   ```

2. **Port 3001 already in use**
   ```bash
   # Find and kill the process using port 3001
   npx kill-port 3001
   # Or on Linux:
   lsof -ti:3001 | xargs kill -9
   ```

3. **SQLite database file locked**
   ```bash
   # Stop all Node processes
   pkill -f node
   # Delete WAL files (safe — WAL contains only uncommitted transactions)
   rm backend/data/app.db-wal backend/data/app.db-shm
   # Restart
   npm run dev
   ```

4. **Missing npm dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

5. **TypeScript compilation errors**
   ```bash
   cd backend && npx tsc --noEmit
   # Fix any reported errors before running
   ```

---

### ❌ Frontend Can't Connect to Backend

**Symptoms**: Dashboard shows "Failed to fetch" or CORS errors in browser console.

**Checklist**:

1. **Backend is running**: `curl http://localhost:3001/health` should return `{"status":"ok"}`.
2. **CORS configuration**: Verify `CORS_ORIGIN` in `backend/.env` includes `http://localhost:3000`.
3. **Frontend API base URL**: Check `frontend/.env.local` has `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`.
4. **Firewall**: Ensure no firewall is blocking port 3001.

---

### ❌ OCR Returns Gibberish

**Symptoms**: Uploaded document produces garbled or nonsensical text.

**Causes & Fixes**:

1. **Low image quality**: Tesseract.js requires clear text at 300+ DPI.
   - Re-scan or re-photograph the document at higher resolution
   - Ensure good lighting and contrast

2. **Non-standard fonts**: Handwriting, decorative fonts, or very small text
   - Tesseract works best with printed text in common fonts
   - Chinese text recognition accuracy varies by font

3. **Scanned PDF without OCR layer**: Pure-image PDFs require Tesseract to extract text
   - The OCR pipeline handles this but accuracy depends on source quality
   - Consider converting PDF pages to high-res PNG before uploading

4. **Document language mismatch**
   - Tesseract auto-detects language but mixed Chinese/English content may confuse it
   - Currently no explicit language parameter in the upload flow

---

### ❌ Knowledge Graph Empty After Upload

**Symptoms**: Job completes successfully but no nodes appear in the graph.

**Causes & Fixes**:

1. **Job actually failed**: Check job status at `/api/jobs/:jobId`.
   ```bash
   curl http://localhost:3001/api/jobs/YOUR_JOB_ID
   ```
   Look for `status: "failed"` and check the error message.

2. **AI matching returned no matches**: The AI may have determined the content is entirely new or couldn't match against existing nodes.
   - Try uploading content that overlaps with existing knowledge graph topics
   - Ensure existing graph has nodes with meaningful content and keywords

3. **Moonshot API unavailable**: Check if the circuit breaker is open.
   ```bash
   # In the backend logs, look for:
   # "Moonshot API unavailable (circuit open)"
   ```
   Wait 30 seconds for the circuit to reset, then retry.

4. **Job still processing**: Check the job status — processing can take 30–120 seconds depending on document size and AI response time.

---

## Quota Issues

### ❌ "Quota Exceeded" Error

**Symptoms**: 429 response with `QUOTA_EXCEEDED` error code.

**Message**: "本月XX额度已用完（N/N）。升级套餐获取更多额度。"

**Resolution**:

1. **Check current usage**:
   ```bash
   curl http://localhost:3001/api/user/quota \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. **Wait for reset**: Free tier resets on the 1st of each UTC month. Paid tiers reset on subscription anniversary.

3. **Upgrade tier**: Go to Settings → Subscription to upgrade.

4. **If quota seems wrong**: The lazy rollover mechanism may not have triggered yet. Make a request that would trigger `enforceQuota()` — the middleware checks and resets expired periods automatically.

---

### ❌ Upload Blocked by Size Limit

**Symptoms**: HTTP 413 with message "文件大小超过 XX套餐限制 (XXMB)".

**Resolution**:

1. **Reduce file size**: Compress the document or split into smaller files.
2. **Upgrade tier**: Monthly/Yearly plans allow up to 100MB per file.

---

## Payment Issues

### ❌ WeChat Pay Webhook Not Received

**Symptoms**: Payment completed in WeChat but subscription status not updated.

**Troubleshooting**:

1. **Check webhook logs**: Look in `webhook_events` table for the event.
   ```sql
   SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;
   ```

2. **Verify webhook URL**: Ensure WeChat Pay merchant console has the correct callback URL configured.

3. **Network access**: The server must be reachable from WeChat Pay servers.
   - Verify HTTPS is properly configured
   - Check firewall rules allow inbound connections on the webhook port

4. **Idempotency**: Duplicate webhooks are silently ignored. Check `webhook_events` for the event ID.

---

## Performance Issues

### ❌ Slow Upload Processing

**Symptoms**: Jobs take >2 minutes to complete.

**Causes**:

1. **Large document**: OCR processing time scales with page count and image resolution.
   - Split large documents into smaller uploads
   - Reduce image resolution to 200–300 DPI

2. **AI API latency**: Moonshot AI response times vary.
   - Check `MOONSHOT_MODEL` in `.env` — smaller models are faster
   - Circuit breaker may be in half-open state, adding retry latency

3. **Queue congestion**: Multiple jobs in the queue.
   - Check queue status: `curl http://localhost:3001/api/jobs?status=processing`
   - Queue polls every 5 seconds, processes one job at a time

---

### ❌ Frontend Pages Load Slowly

**Symptoms**: Dashboard or graph pages take >5 seconds to load.

**Diagnosis**:

1. **Check browser DevTools Network tab**: Look for slow API requests.
2. **Knowledge graph with many nodes**: Large graphs (>200 nodes) may cause render lag.
   - Consider filtering or collapsing sections of the graph
   - Graph visualization uses `@xyflow/react` — canvas-based rendering is generally performant

3. **Next.js dev mode**: Development mode is slower than production builds. Test performance with `npm run build && npm run start`.

---

## Database Issues

### ❌ SQLite Database Corruption

**Symptoms**: Backend crashes or returns inconsistent data.

**Recovery**:

1. **Check integrity**:
   ```bash
   node -e "const db = require('better-sqlite3')('backend/data/app.db'); console.log(db.pragma('integrity_check'))"
   ```

2. **Restore from backup**:
   ```bash
   # Stop backend
   pm2 stop backend
   # Copy most recent backup
   cp /backups/app.db.YYYY-MM-DD backend/data/app.db
   # Restart
   pm2 start backend
   ```

3. **If no backup exists**:
   ```bash
   # Dump and re-import
   node -e "const db = require('better-sqlite3')('backend/data/app.db'); console.log(db.backup('backend/data/app-recovery.db'))"
   ```

---

## Circuit Breaker Issues

### ❌ "Moonshot API Unavailable"

**Symptoms**: Jobs fail with "Moonshot API unavailable (circuit open)" error.

**Resolution**:

1. **Wait**: The circuit breaker resets automatically after 30 seconds of cooldown.
2. **Check Moonshot API status**: Verify Moonshot's service is operational.
3. **Check API key and credits**: Ensure `MOONSHOT_API_KEY` is valid and has remaining credits.
4. **Force reset** (development only): Restart the backend server — circuit state is in-memory.

---

## Authentication Issues

### ❌ "Account Locked" After Failed Logins

**Symptoms**: 429 error "Account locked" after repeated failed login attempts.

**Resolution**:

1. **Wait 1 hour**: Account automatically unlocks after the lockout period.
2. **Use password reset**: If available, reset your password after the lockout expires.
3. **Admin override**: Admin can manually clear the lockout by restarting the backend (lock state is in-memory).

---

### ❌ Token Revoked / Invalid Token

**Symptoms**: API returns 401 even though you just logged in.

**Causes & Fixes**:

1. **Token expired**: Access tokens expire. Use your refresh token to get a new one.
2. **Logged out on another device**: Logout revokes the token's JTI. Re-login to get a new token.
3. **Server restart**: Token revocation data is in-memory and lost on restart. Re-login.

---

## Getting Help

If the issue persists after trying the above:

1. **Check backend logs**: `pm2 logs backend` or `tail -f backend/logs/app.log`
2. **Check Sentry**: Look for the error at your Sentry dashboard
3. **Run health check**: `curl http://localhost:3001/health`
4. **Enable debug logging**: Set `LOG_LEVEL=debug` in `.env` and restart

---

**Last updated:** 2026-07-12

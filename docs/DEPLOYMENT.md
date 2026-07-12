# Deployment Guide

> Production deployment on Tencent Lighthouse with PM2, monitoring, and backups.

---

## Deployment Target

| Property | Value |
|---|---|
| **Provider** | Tencent Lighthouse (腾讯云轻量应用服务器) |
| **Specs** | 4C4G, 7Mbps bandwidth, 1000GB SSD |
| **OS** | Linux (Ubuntu) |
| **SSH Host** | `vectorserver` (configured in `~/.ssh/config`) |
| **Remote Path** | `/home/nathan/ocr-kb-matcher` |
| **Domain** | TBD (requires ICP备案) |

---

## Prerequisites

1. **ICP备案 (ICP Filing)** — required for mainland China hosting. Must be obtained before domain binding and WeChat Pay 商户号.
2. **WeChat Pay 商户号** — required for payment processing. 1–5 business days after ICP备案.
3. **DNS** — configure A record pointing to Lighthouse public IP.

---

## Production Environment Variables

Create `/home/nathan/ocr-kb-matcher/backend/.env` on the server:

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-domain.com
MOONSHOT_API_KEY=sk-...
MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
MOONSHOT_MODEL=moonshot-v1-8k
JWT_SECRET=<64-byte random hex>
JWT_REFRESH_SECRET=<64-byte random hex>
RESEND_API_KEY=re_...
EMAIL_FROM_NAME=OCR KB Matcher
EMAIL_FROM=noreply@your-domain.com
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info
QUEUE_POLL_INTERVAL_MS=5000
TRUST_PROXY=1
ADMIN_EMAILS=admin@your-domain.com
MAX_UPLOAD_SIZE_MB=50
```

Frontend `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com:3001
```

---

## Build & Deploy

### Local Build

```bash
# Build backend
cd backend && npm run build   # tsc → dist/

# Build frontend
cd frontend && npm run build  # next build → .next/
```

### Deploy to Server

```bash
# Sync backend
rsync -avz --delete backend/dist/ vectorserver:/home/nathan/ocr-kb-matcher/backend/dist/
rsync -avz backend/package.json vectorserver:/home/nathan/ocr-kb-matcher/backend/

# Sync frontend
rsync -avz --delete frontend/.next/ vectorserver:/home/nathan/ocr-kb-matcher/frontend/.next/
rsync -avz frontend/package.json vectorserver:/home/nathan/ocr-kb-matcher/frontend/

# Sync ecosystem config
rsync -avz ecosystem.config.js vectorserver:/home/nathan/ocr-kb-matcher/

# Install deps on server
ssh vectorserver "cd /home/nathan/ocr-kb-matcher && npm install --production"
```

### PM2 Process Management

The `ecosystem.config.js` defines 3 processes:

| Process | Script | Purpose |
|---|---|---|
| `proxy` | `standalone-proxy.js` | Frontend proxy/routing |
| `backend` | `backend/dist/index.js` | Express API server (port 3001) |
| `frontend` | `node_modules/.bin/next start` | Next.js production server (port 3000) |

```bash
# Start all
ssh vectorserver "cd /home/nathan/ocr-kb-matcher && pm2 start ecosystem.config.js"

# Reload after deploy (zero-downtime)
ssh vectorserver "cd /home/nathan/ocr-kb-matcher && pm2 reload all"

# View status
ssh vectorserver "pm2 status"

# View logs
ssh vectorserver "pm2 logs backend"
```

---

## HTTPS Setup

### Option 1: Cloudflare (Recommended)

1. Point DNS to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Cloudflare provides free SSL certificate

### Option 2: Direct Nginx + Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (certbot adds cron automatically)
```

---

## Monitoring

### Sentry (Error Monitoring)

- Initialized conditionally: only when `SENTRY_DSN` is set
- All unhandled Express errors captured via `Sentry.captureException()`
- Circuit breaker events (open, halfOpen, close) logged with `event` field for alerting
- Brute-force lockout events captured via `Sentry.captureMessage()`

### UptimeRobot (Health Monitoring)

Configure 2 monitors at [uptimerobot.com](https://uptimerobot.com):

1. **Backend Health**: `GET https://your-domain.com:3001/health`
   - Expected: status 200, body contains `"status":"ok"`
   - Interval: 5 minutes
2. **Frontend**: `GET https://your-domain.com`
   - Expected: status 200
   - Interval: 5 minutes

Alert contacts: email + optional WeChat webhook.

### Structured Logs (pino)

All backend logs are structured JSON via pino. In production, route logs to a file or log aggregation service:

```bash
pm2 start backend/dist/index.js --log /var/log/ocr-kb-matcher/backend.log
```

---

## Daily Backups

Backup scripts are in `backend/scripts/`:

| Script | Platform |
|---|---|
| `backup-db.ps1` | Windows (local dev) |
| `backup-db.sh` | Linux (production) |

### Cron Setup (Production)

```bash
# Run daily at 2:00 AM
0 2 * * * /home/nathan/ocr-kb-matcher/backend/scripts/backup-db.sh
```

### Backup Process

1. **WAL Checkpoint**: `PRAGMA wal_checkpoint(TRUNCATE)` — flushes WAL to main DB file
2. **File Copy**: Copies `app.db` to timestamped backup file
3. **Cloud Upload** (optional): Uploads to Aliyun OSS or AWS S3
4. **Retention**: 30 days local, 90 days cloud

### Restore

```bash
# Stop the server
pm2 stop backend

# Restore from backup
cp /backups/app.db.2026-07-12 /home/nathan/ocr-kb-matcher/backend/data/app.db

# Start the server
pm2 start backend

# Verify integrity
node -e "const db = require('better-sqlite3')('/home/nathan/ocr-kb-matcher/backend/data/app.db'); console.log(db.pragma('integrity_check'))"
```

---

## Rollback

```bash
# 1. Stop current processes
pm2 stop all

# 2. Restore DB from backup (if needed)
cp /backups/app.db.YYYY-MM-DD backend/data/app.db

# 3. Deploy previous version
git checkout <previous-commit>
npm run build
pm2 start ecosystem.config.js

# 4. Verify
curl https://your-domain.com:3001/health
```

---

## Scaling Notes

### Current Architecture Limits

- **Single-process Backend**: Express runs in a single Node.js process. CPU-bound OCR tasks are sequential.
- **SQLite**: Single-writer constraint. Suitable for <1000 concurrent users.
- **Job Queue**: In-process polling loop (every 5s), single worker.

### Future Scaling (Planned Q3)

| Component | Current | Future |
|---|---|---|
| Database | SQLite | PostgreSQL (or keep SQLite + add read replicas) |
| Job Queue | In-process polling | BullMQ + Redis |
| Backend | Single process | PM2 cluster mode (multiple instances) |
| OCR | Sequential | Worker thread pool |
| Cache | None | Redis for session + quota |

### Cost Estimation at Scale

| Users | Server Cost | AI Cost | Total |
|---|---|---|---|
| 100 | ¥100/mo | ¥210/mo | ¥310/mo |
| 1,000 | ¥200/mo | ¥2,100/mo | ¥2,300/mo |
| 5,000 | ¥500/mo | ¥10,500/mo | ¥11,000/mo |
| 10,000 | ¥800/mo | ¥21,000/mo | ¥21,800/mo |

---

**Last updated:** 2026-07-12

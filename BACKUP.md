# Backup & Restore Procedure

## Overview

The OCR Knowledge Base Matcher uses a single SQLite database at `backend/data/app.db`
(all tables in one file). Daily backups are created by the backup scripts and stored
locally (30-day retention) and optionally in cloud storage (90-day retention).

## Backup Schedule

| Environment | Frequency | Time | Trigger |
|---|---|---|---|
| Production (server) | Daily | 02:00 | Cron (`0 2 * * *`) |
| Local dev | Manual or scheduled | Any | `powershell -File backend/scripts/backup-db.ps1` |

### Recommended Cron (Production)

```
0 2 * * * /home/nathan/ocr-kb-matcher/backend/scripts/backup-db.sh --cloud >> /home/nathan/ocr-kb-matcher/backup.log 2>&1
```

## Backup Scripts

### Windows / Local Dev (`backend/scripts/backup-db.ps1`)

```powershell
# Local backup only
powershell -File backend/scripts/backup-db.ps1

# With cloud upload
powershell -File backend/scripts/backup-db.ps1 -CloudUpload
```

### Linux / Production (`backend/scripts/backup-db.sh`)

```bash
# Local backup only
./backend/scripts/backup-db.sh

# With cloud upload
./backend/scripts/backup-db.sh --cloud
```

## Storage Layout

### Local Filesystem

```
backend/
├── data/
│   └── app.db                        # Live database
├── backups/
│   ├── 2026-07-12/
│   │   └── app.db                    # Backup snapshot
│   ├── 2026-07-11/
│   │   └── app.db
│   └── ...
└── backup.log                        # Backup operation log
```

### Cloud Storage (Aliyun OSS / AWS S3)

```
oss://<bucket>/backups/
└── 2026-07-12/
    └── app.db
```

Or for S3:

```
s3://<bucket>/backups/
└── 2026-07-12/
    └── app.db
```

## Retention Policy

| Storage | Retention | Cleanup Mechanism |
|---|---|---|
| Local (`backups/`) | 30 days | Automatic — script deletes dirs older than 30 days |
| Cloud (OSS/S3) | 90 days | Automatic — script deletes objects older than 90 days |

## Prerequisites

### For Cloud Upload

#### Aliyun OSS (Primary)

1. Install [ossutil](https://www.alibabacloud.com/help/en/oss/developer-reference/install-ossutil)
2. Set environment variables:
   ```bash
   export OSS_ACCESS_KEY_ID="your-access-key-id"
   export OSS_ACCESS_KEY_SECRET="your-access-key-secret"
   export OSS_BUCKET="your-bucket-name"
   export OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"  # optional, default shown
   ```

#### AWS S3 (Alternative)

1. Install [AWS CLI](https://aws.amazon.com/cli/)
2. Configure credentials:
   ```bash
   export AWS_ACCESS_KEY_ID="your-access-key-id"
   export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
   export S3_BUCKET="your-bucket-name"
   ```

## Restore Procedure

### Quick Restore (Local Backup Available)

```bash
# 1. Stop the server (if running)
pm2 stop all
# or: Ctrl+C in dev terminal

# 2. Find the backup to restore
ls backend/backups/
# Pick the desired date, e.g. 2026-07-12

# 3. Restore (PowerShell — Windows)
Copy-Item -LiteralPath "backend/backups/2026-07-12/app.db" -Destination "backend/data/app.db" -Force

# Restore (Bash — Linux)
cp backend/backups/2026-07-12/app.db backend/data/app.db

# 4. Restart the server
pm2 restart all
# or: npm run dev
```

### Cloud Restore (No Local Backup)

> Requires `ossutil` (Aliyun) or `aws` CLI (S3) installed + credentials.

**Aliyun OSS:**
```bash
ossutil cp oss://<bucket>/backups/2026-07-12/app.db backend/data/app.db
```

**AWS S3:**
```bash
aws s3 cp s3://<bucket>/backups/2026-07-12/app.db backend/data/app.db
```

### Verify Restore

After restoring, verify the database is intact:

```bash
# Option 1: SQLite quick check
sqlite3 backend/data/app.db "PRAGMA integrity_check;"

# Option 2: Node.js check
node -e "
  const Database = require('better-sqlite3');
  const db = new Database('backend/data/app.db');
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('Users:', count);
  db.close();
"

# Option 3: Health check
curl http://localhost:3001/health
```

## Disaster Recovery (Full Server Loss)

1. Provision new server
2. Clone repository: `git clone https://github.com/nathanz3491/ocr-kb-matcher.git`
3. Install dependencies: `npm install`
4. Restore DB from cloud (see "Cloud Restore" above)
5. Configure `.env` with secrets from password manager
6. Start server: `pm2 start ecosystem.config.js`

## Technical Details

### Consistency Guarantee

The backup script performs a `PRAGMA wal_checkpoint(TRUNCATE)` before copying
`app.db`. This flushes the Write-Ahead Log (WAL) into the main database file,
producing a consistent snapshot without needing `VACUUM INTO` or `sqlite3 .backup`.

The backup file is a plain SQLite database — it can be opened directly with
any SQLite tool for inspection without a restore.

### Single-File Nature

Because SQLite stores the entire database in one file (`app.db`), backup is a
simple file copy after WAL checkpoint. WAL mode produces two auxiliary files
(`app.db-wal`, `app.db-shm`) that are automatically checkpointed during the
backup process and do not need separate backup.

## Disclaimers

- **Encryption**: Backups are unencrypted. If encryption is required, pipe through
  `gpg --symmetric` or use server-side encryption on OSS/S3 buckets.
- **Monitoring**: The script logs to `backup.log`. On production, set up a log
  watcher or integrate with your monitoring system to alert on backup failures.
- **Point-in-Time Recovery**: SQLite does not support PITR. The backup represents
  the state at the time of checkpoint. For sub-daily recovery, consider increasing
  backup frequency.
- **Concurrent Writes**: If a write is in progress during checkpoint, it will
  complete before the checkpoint finishes. No data loss occurs.

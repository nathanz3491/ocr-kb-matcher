# Operations Guide

## Backup & Restore

### Automated Backups

Run `backend/scripts/backup-db.{sh,ps1}` to create a database backup:

```bash
# Linux (local only)
./backend/scripts/backup-db.sh

# Linux (with cloud upload)
./backend/scripts/backup-db.sh --cloud

# Windows (local only)
powershell -File backend/scripts/backup-db.ps1

# Windows (with cloud upload)
powershell -File backend/scripts/backup-db.ps1 -CloudUpload
```

**What it does:**
1. WAL checkpoint via `PRAGMA wal_checkpoint(TRUNCATE)` for consistency
2. Copies `backend/data/app.db` to `backend/backups/YYYY-MM-DD/app.db`
3. Verifies copy size matches the original
4. Optionally uploads to Aliyun OSS or AWS S3 (`--cloud` flag)
5. Cleans up old backups per retention policy

**Retention policy:**
| Location | Retention | Target |
|---|---|---|
| Local (`backend/backups/`) | 30 days | Quick restores, dev debugging |
| Cloud (OSS/S3) | 90 days | Disaster recovery, off-site backup |

**Scheduling (production):**
```
0 2 * * * /home/nathan/ocr-kb-matcher/backend/scripts/backup-db.sh --cloud
```

---

### Restoring a Backup

Run `backend/scripts/restore-db.{sh,ps1}` to restore a database from backup:

```bash
# Linux — restore today's backup
./backend/scripts/restore-db.sh

# Linux — restore a specific date
./backend/scripts/restore-db.sh 2026-07-01

# Windows
powershell -File backend/scripts/restore-db.ps1 -BackupDate "2026-07-01"
```

**What it does:**
1. Stops the backend process (PM2 `stop backend` on Linux, kills Node on Windows)
2. Creates a safety backup of the current DB (`app.db.pre-restore-<timestamp>`)
3. Copies the backup file to `backend/data/app.db`
4. Verifies integrity with `PRAGMA integrity_check` and `PRAGMA quick_check`
5. Rolls back on failure (restores the pre-restore safety copy)
6. Restarts the backend

**Restore flow:**
```
Backup → Stop backend → Safety-copy current DB → Copy backup in place → Verify → Restart backend
                                                                              ↓ (failure)
                                                                       Roll back (restore safety copy)
```

**Available backups list:**
```bash
./backend/scripts/restore-db.sh --help
```

---

### Verifying a Restore

After restore, verify the system is healthy:

```bash
# 1. Health check
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"...","service":"ocr-kb-matcher-backend"}

# 2. Check that expected data exists
sqlite3 backend/data/app.db "SELECT COUNT(*) FROM users;"
sqlite3 backend/data/app.db "SELECT id, email, created_at FROM users LIMIT 5;"

# 3. Verify graph data
sqlite3 backend/data/app.db "SELECT COUNT(*) FROM nodes;"
sqlite3 backend/data/app.db "SELECT COUNT(*) FROM edges;"

# 4. If a sentinel user was inserted before backup, verify it round-tripped
sqlite3 backend/data/app.db "SELECT id, email FROM users WHERE id='restore-sentinel';"
```

---

## When to Restore

| Scenario | Action |
|---|---|
| **Database corruption** | Restore from most recent backup. Verify integrity. If backup is also corrupt, go back one day further. |
| **Accidental data deletion** | Restore from the last backup before the deletion occurred. |
| **Dev testing / QA** | Restore a production backup to a local dev instance to test against real data. |
| **Schema migration rollback** | If a migration fails, restore the pre-migration backup. |
| **New server deployment** | Restore the latest backup onto the new server to seed it with existing data. |

---

## Integrity Checks

The restore script runs two pragmas:

1. **`PRAGMA integrity_check`** — Full scan of all tables and indexes. Returns `ok` or a list of errors.
2. **`PRAGMA quick_check`** — Faster scan that only checks for errors (skips some checks). Return `ok` or error details.

If either check fails, the restore is **automatically rolled back** — the original DB is restored from the safety copy.

---

## Safety Features

- **Pre-restore safety copy:** Before overwriting, the current DB is saved to `app.db.pre-restore-<timestamp>`. This ensures you can always revert.
- **Size verification:** The restored file size is compared to the backup file size. A mismatch triggers rollback.
- **Integrity guard:** Failed integrity checks trigger automatic rollback.
- **Process management:** The script stops the backend before restore to avoid file lock conflicts and prevent writes to a partially-restored DB.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BACKUP_DIR` | No | Override backup directory (default: `backend/backups`) |
| `TARGET_DB` | No | Override target DB path (default: `backend/data/app.db`) |

---

## Troubleshooting

### "Backend won't start after restore"
- Check PM2 logs: `pm2 logs backend`
- Verify the DB file permissions: `ls -la backend/data/app.db`
- Check for WAL/SHM files: `ls backend/data/app.db-wal backend/data/app.db-shm` — delete them if present

### "Integrity check fails"
- Try restoring an older backup: `./backend/scripts/restore-db.sh 2026-07-10`
- If all backups fail integrity check, the original DB may have been corrupted before backup. Check backup logs.

### "Cannot stop backend"
- Manually kill the process: `pm2 kill` then restore, then `pm2 resurrect`
- On Windows: `Get-Process node | Stop-Process -Force`

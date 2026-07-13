#!/usr/bin/env bash
#
# Restore SQLite database from a timestamped backup.
# Copies a backup app.db back to backend/data/app.db,
# verifies integrity, and restarts the backend process.
#
# Usage:
#   ./backend/scripts/restore-db.sh               # restore today's backup
#   ./backend/scripts/restore-db.sh 2026-07-01     # restore a specific date
#   ./backend/scripts/restore-db.sh --help          # this help
#
# Prerequisites:
#   - PM2 for process management (backend process must use PM2)
#   - better-sqlite3 installed in backend/node_modules

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
BACKUP_ROOT="$PROJECT_ROOT/backups"
DB_FILE="$DATA_DIR/app.db"
LOG_FILE="$PROJECT_ROOT/backup.log"
PM2_PROCESS_NAME="backend"

# Parse arguments
BACKUP_DATE="${1:-$(date +%Y-%m-%d)}"
if [ "$BACKUP_DATE" = "--help" ] || [ "$BACKUP_DATE" = "-h" ]; then
  echo "Usage: $(basename "$0") [YYYY-MM-DD]"
  echo "  Restore SQLite DB from backups/<date>/app.db"
  echo ""
  echo "  YYYY-MM-DD: date of backup to restore (default: today)"
  echo ""
  echo "  Options:"
  echo "    --from-backup <date>   Restore from backup date"
  echo "    --help,-h              Show this help"
  echo ""
  echo "  Available backups:"
  if [ -d "$BACKUP_ROOT" ]; then
    ls -1 "$BACKUP_ROOT" 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' | sort -r
  fi
  exit 0
fi

BACKUP_DIR="$BACKUP_ROOT/$BACKUP_DATE"
BACKUP_FILE="$BACKUP_DIR/app.db"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" | tee -a "$LOG_FILE"
}

# ── Pre-flight ────────────────────────────────────────────────────
if [ ! -f "$BACKUP_FILE" ]; then
  log "ERROR: Backup not found: $BACKUP_FILE"
  log "  Available backups:"
  if [ -d "$BACKUP_ROOT" ]; then
    ls -1 "$BACKUP_ROOT" 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' | while read -r d; do
      if [ -f "$BACKUP_ROOT/$d/app.db" ]; then
        SIZE=$(stat -c%s "$BACKUP_ROOT/$d/app.db" 2>/dev/null || stat -f%z "$BACKUP_ROOT/$d/app.db" 2>/dev/null)
        echo "    $d  ($SIZE bytes)"
      fi
    done
  fi
  exit 1
fi

# ── Step 1: Stop backend process ──────────────────────────────────
log "Step 1: Stopping backend (PM2: $PM2_PROCESS_NAME)..."
if command -v pm2 &>/dev/null; then
  pm2 stop "$PM2_PROCESS_NAME" 2>/dev/null && log "  Stopped $PM2_PROCESS_NAME" || log "  WARNING: $PM2_PROCESS_NAME was not running"
else
  log "  WARNING: PM2 not found — ensure the backend is stopped before restore"
fi

# Give the process a moment to release file locks
sleep 1

# ── Step 2: Backup current DB (safety net) ────────────────────────
log "Step 2: Backing up current DB (pre-restore safety)..."
if [ -f "$DB_FILE" ]; then
  PRE_RESTORE="${DB_FILE}.pre-restore-$(date +%s)"
  cp "$DB_FILE" "$PRE_RESTORE"
  PRE_SIZE=$(stat -c%s "$PRE_RESTORE" 2>/dev/null || stat -f%z "$PRE_RESTORE" 2>/dev/null)
  log "  Saved: $PRE_RESTORE ($PRE_SIZE bytes)"
else
  log "  No existing DB to back up (fresh restore)"
fi

# ── Step 3: Restore from backup ───────────────────────────────────
log "Step 3: Restoring $BACKUP_FILE -> $DB_FILE"
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
BACKUP_HASH=$(sha256sum "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1 || md5 -q "$BACKUP_FILE" 2>/dev/null || echo "")

cp "$BACKUP_FILE" "$DB_FILE"
RESTORED_SIZE=$(stat -c%s "$DB_FILE" 2>/dev/null || stat -f%z "$DB_FILE" 2>/dev/null)
RESTORED_HASH=$(sha256sum "$DB_FILE" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$DB_FILE" 2>/dev/null | cut -d' ' -f1 || md5 -q "$DB_FILE" 2>/dev/null || echo "")

if [ "$RESTORED_SIZE" != "$BACKUP_SIZE" ]; then
  log "ERROR: Copy size mismatch (expected=$BACKUP_SIZE, got=$RESTORED_SIZE)"
  log "  Rolling back..."
  rm -f "$DB_FILE"
  if [ -f "$PRE_RESTORE" ]; then
    mv "$PRE_RESTORE" "$DB_FILE"
    log "  Previous DB restored from pre-restore backup."
  fi
  exit 1
fi

if [ -n "$BACKUP_HASH" ] && [ -n "$RESTORED_HASH" ] && [ "$BACKUP_HASH" != "$RESTORED_HASH" ]; then
  log "ERROR: Copy hash mismatch (backup=$BACKUP_HASH, restored=$RESTORED_HASH)"
  log "  Rolling back..."
  rm -f "$DB_FILE"
  if [ -f "$PRE_RESTORE" ]; then
    mv "$PRE_RESTORE" "$DB_FILE"
    log "  Previous DB restored from pre-restore backup."
  fi
  exit 1
fi
log "  Restored: $RESTORED_SIZE bytes"

# ── Step 4: Verify integrity ──────────────────────────────────────
log "Step 4: Verifying integrity..."
if command -v node &>/dev/null && [ -f "$PROJECT_ROOT/node_modules/better-sqlite3/package.json" ]; then
  DB_PATH="$DB_FILE"
  INTEGRITY=$(node -e "
    const Database = require('better-sqlite3');
    const db = new Database('$DB_PATH');
    const result = db.pragma('integrity_check');
    console.log(JSON.stringify(Array.isArray(result) ? result : [{integrity_check: result}]));
    db.close();
  " 2>&1) || INTEGRITY="NODE_ERROR"

  FAIL_COUNT=$(node -e "
    const Database = require('better-sqlite3');
    const db = new Database('$DB_PATH');
    const result = db.pragma('integrity_check');
    const rows = Array.isArray(result) ? result : [{integrity_check: result}];
    const failures = rows.filter(r => r.integrity_check !== 'ok' && !String(r.integrity_check).startsWith('ok'));
    console.log(failures.length);
    db.close();
  " 2>&1) || FAIL_COUNT="NODE_ERROR"

  if [ "$FAIL_COUNT" = "0" ]; then
    log "  integrity_check: OK"
  elif [ "$FAIL_COUNT" = "NODE_ERROR" ]; then
    log "  WARNING: Could not run integrity check via Node. DB may be damaged."
  else
    log "  ERROR: integrity_check found $FAIL_COUNT failure(s):"
    echo "$INTEGRITY" | while read -r line; do
      log "    $line"
    done
    log "  Rolling back..."
    rm -f "$DB_FILE"
    if [ -f "$PRE_RESTORE" ]; then
      mv "$PRE_RESTORE" "$DB_FILE"
      log "  Previous DB restored from pre-restore backup."
    fi
    exit 1
  fi

  # Additional pragma: quick check for any issues
  QUICK_CHECK=$(node -e "
    const Database = require('better-sqlite3');
    const db = new Database('$DB_PATH');
    try {
      const c = db.pragma('quick_check');
      console.log(JSON.stringify(c));
    } catch(e) { console.log('error:' + e.message); }
    db.close();
  " 2>&1)
  if echo "$QUICK_CHECK" | grep -qi 'ok'; then
    log "  quick_check: OK"
  else
    log "  WARNING: quick_check: $QUICK_CHECK"
  fi
elif command -v sqlite3 &>/dev/null; then
  INTEGRITY=$(sqlite3 "$DB_FILE" "PRAGMA integrity_check;" 2>&1)
  if echo "$INTEGRITY" | grep -qi 'ok'; then
    log "  integrity_check: OK (via sqlite3)"
  else
    log "  ERROR: integrity_check failed: $INTEGRITY"
    log "  Rolling back..."
    rm -f "$DB_FILE"
    if [ -f "$PRE_RESTORE" ]; then
      mv "$PRE_RESTORE" "$DB_FILE"
      log "  Previous DB restored from pre-restore backup."
    fi
    exit 1
  fi
else
  log "  WARNING: Neither Node/better-sqlite3 nor sqlite3 found — cannot verify integrity"
fi

# ── Step 5: Restart backend ───────────────────────────────────────
log "Step 5: Restarting backend..."
if command -v pm2 &>/dev/null; then
  pm2 start "$PM2_PROCESS_NAME" 2>/dev/null && log "  Started $PM2_PROCESS_NAME" || {
    log "  WARNING: Could not start via PM2. Run manually: pm2 start $PM2_PROCESS_NAME"
  }
else
  log "  PM2 not found — start backend manually:"
  log "    cd $PROJECT_ROOT && npm run dev:backend"
fi

# ── Summary ───────────────────────────────────────────────────────
log "Restore complete: $BACKUP_FILE -> $DB_FILE ($RESTORED_SIZE bytes)"
log "  Verify: curl http://localhost:3001/health"
exit 0

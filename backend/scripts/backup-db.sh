#!/usr/bin/env bash
#
# Daily SQLite database backup script (Linux / production).
# Copies backend/data/app.db to a timestamped local backup directory
# and uploads to cloud storage (Aliyun OSS or AWS S3) when credentials are set.
#
# Usage:
#   ./backend/scripts/backup-db.sh              # local backup only
#   ./backend/scripts/backup-db.sh --cloud       # with cloud upload
#   ./backend/scripts/backup-db.sh --help        # this help
#
# Schedule (cron): 0 2 * * * /path/to/backend/scripts/backup-db.sh --cloud

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
BACKUP_ROOT="$PROJECT_ROOT/backups"
DB_FILE="$DATA_DIR/app.db"
LOG_FILE="$PROJECT_ROOT/backup.log"
DATE_STAMP="$(date +%Y-%m-%d)"
BACKUP_DIR="$BACKUP_ROOT/$DATE_STAMP"
BACKUP_FILE="$BACKUP_DIR/app.db"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" | tee -a "$LOG_FILE"
}

# ── Pre-flight ────────────────────────────────────────────────────
if [ ! -f "$DB_FILE" ]; then
  log "ERROR: Database not found at $DB_FILE"
  exit 1
fi

# ── Step 1: Checkpoint WAL for consistency ────────────────────────
log "Step 1: Checkpointing WAL..."
if command -v node &>/dev/null && [ -f "$PROJECT_ROOT/node_modules/better-sqlite3/package.json" ]; then
  node -e "
    const Database = require('better-sqlite3');
    const db = new Database('$DB_FILE');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
  " 2>/dev/null && log "  WAL checkpoint: OK" || log "  WARNING: checkpoint failed, proceeding anyway"
elif command -v sqlite3 &>/dev/null; then
  sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null && log "  WAL checkpoint: OK (sqlite3)" || log "  WARNING: sqlite3 checkpoint failed"
else
  log "  WARNING: Neither node/better-sqlite3 nor sqlite3 found — copying without checkpoint (may be inconsistent)"
fi

# ── Step 2: Create backup directory & copy ────────────────────────
log "Step 2: Creating backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp "$DB_FILE" "$BACKUP_FILE"

ORIGINAL_SIZE="$(stat -c%s "$DB_FILE" 2>/dev/null || stat -f%z "$DB_FILE" 2>/dev/null)"
BACKUP_SIZE="$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)"

if [ "$ORIGINAL_SIZE" != "$BACKUP_SIZE" ]; then
  log "ERROR: Backup size mismatch (original=$ORIGINAL_SIZE, backup=$BACKUP_SIZE)"
  exit 1
fi

log "  Backup file: $BACKUP_FILE ($BACKUP_SIZE bytes)"

# ── Step 3: Cloud upload ──────────────────────────────────────────
if [ "${1:-}" = "--cloud" ]; then
  log "Step 3: Cloud upload..."

  ALIYUN_KEY="${OSS_ACCESS_KEY_ID:-}"
  ALIYUN_SECRET="${OSS_ACCESS_KEY_SECRET:-}"
  OSS_BUCKET="${OSS_BUCKET:-}"
  OSS_ENDPOINT="${OSS_ENDPOINT:-oss-cn-hangzhou.aliyuncs.com}"

  AWS_KEY="${AWS_ACCESS_KEY_ID:-}"
  S3_BUCKET="${S3_BUCKET:-}"

  UPLOADED=false

  if [ -n "$ALIYUN_KEY" ] && [ -n "$ALIYUN_SECRET" ] && [ -n "$OSS_BUCKET" ]; then
    OSS_PATH="oss://$OSS_BUCKET/backups/$DATE_STAMP/app.db"
    if command -v ossutil &>/dev/null; then
      if ossutil cp "$BACKUP_FILE" "$OSS_PATH" -i "$ALIYUN_KEY" -k "$ALIYUN_SECRET" -e "$OSS_ENDPOINT" >/dev/null 2>&1; then
        log "  Aliyun OSS: uploaded to $OSS_PATH"
        UPLOADED=true
      else
        log "  WARNING: Aliyun OSS upload failed"
      fi
    else
      log "  WARNING: ossutil not installed, cannot upload to Aliyun OSS"
    fi
  elif [ -n "$AWS_KEY" ] && [ -n "$S3_BUCKET" ]; then
    S3_PATH="s3://$S3_BUCKET/backups/$DATE_STAMP/app.db"
    if command -v aws &>/dev/null; then
      if aws s3 cp "$BACKUP_FILE" "$S3_PATH" >/dev/null 2>&1; then
        log "  AWS S3: uploaded to $S3_PATH"
        UPLOADED=true
      else
        log "  WARNING: AWS S3 upload failed"
      fi
    else
      log "  WARNING: aws CLI not installed, cannot upload to S3"
    fi
  else
    log "  WARNING: --cloud flag set but no cloud credentials found. Skipping."
  fi

  # ── Cloud retention 90 days ─────────────────────────────────────
  if [ "$UPLOADED" = true ]; then
    log "  Cloud retention: keeping last 90 days..."
    CUTOFF=$(date -d '90 days ago' +%s 2>/dev/null || date -v-90d +%s 2>/dev/null || echo "")

    if [ -n "$CUTOFF" ] && [ -n "$OSS_BUCKET" ] && command -v ossutil &>/dev/null; then
      ossutil ls "oss://$OSS_BUCKET/backups/" 2>/dev/null | grep -oP '\d{4}-\d{2}-\d{2}' | sort -u | while read -r BAK_DATE; do
        BAK_TS=$(date -d "$BAK_DATE" +%s 2>/dev/null)
        if [ -n "$BAK_TS" ] && [ "$BAK_TS" -lt "$CUTOFF" ]; then
          ossutil rm "oss://$OSS_BUCKET/backups/$BAK_DATE/app.db" >/dev/null 2>&1 && log "    Deleted: $BAK_DATE"
        fi
      done
    elif [ -n "$CUTOFF" ] && [ -n "$S3_BUCKET" ] && command -v aws &>/dev/null; then
      aws s3 ls "s3://$S3_BUCKET/backups/" 2>/dev/null | grep -oP '\d{4}-\d{2}-\d{2}' | sort -u | while read -r BAK_DATE; do
        BAK_TS=$(date -d "$BAK_DATE" +%s 2>/dev/null)
        if [ -n "$BAK_TS" ] && [ "$BAK_TS" -lt "$CUTOFF" ]; then
          aws s3 rm "s3://$S3_BUCKET/backups/$BAK_DATE/app.db" >/dev/null 2>&1 && log "    Deleted: $BAK_DATE"
        fi
      done
    fi
  fi
else
  log "Step 3: Cloud upload skipped (pass --cloud for production)"
fi

# ── Step 4: Local retention (30 days) ─────────────────────────────
log "Step 4: Local retention (keep last 30 days)..."
find "$BACKUP_ROOT" -maxdepth 1 -type d -name '????-??-??' | while read -r DIR; do
  DIR_DATE="$(basename "$DIR")"
  if [[ "$DIR_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    if [ "$(uname)" = "Darwin" ]; then
      DIR_TS=$(date -j -f "%Y-%m-%d" "$DIR_DATE" +%s 2>/dev/null || echo "0")
    else
      DIR_TS=$(date -d "$DIR_DATE" +%s 2>/dev/null || echo "0")
    fi
    CUTOFF_LOCAL=$(date -d '30 days ago' +%s 2>/dev/null || date -v-30d +%s 2>/dev/null || echo "0")
    if [ "$DIR_TS" -ne 0 ] && [ "$DIR_TS" -lt "$CUTOFF_LOCAL" ]; then
      rm -rf "$DIR"
      log "  Deleted old backup: $DIR"
    fi
  fi
done

# ── Summary ──────────────────────────────────────────────────────
log "Backup complete: $BACKUP_FILE ($BACKUP_SIZE bytes)"
exit 0

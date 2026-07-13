<#
.SYNOPSIS
  Restore SQLite database from a timestamped backup (Windows / local dev).
  Copies a backup app.db back to backend/data/app.db,
  verifies integrity, and provides instructions to restart the backend.

.DESCRIPTION
  - Stops the backend Node process (if running)
  - Creates a safety backup of the current DB before overwriting
  - Restores the selected backup file
  - Runs PRAGMA integrity_check and quick_check for verification
  - Rolls back on failure (restores the pre-restore safety copy)
  - Provides instructions to restart the backend

.PARAMETER BackupDate
  Date of the backup to restore in yyyy-MM-dd format (default: today).

.EXAMPLE
  # Restore today's backup
  powershell -File backend/scripts/restore-db.ps1

  # Restore a specific backup
  powershell -File backend/scripts/restore-db.ps1 -BackupDate "2026-07-01"
#>

param(
  [string]$BackupDate = (Get-Date -Format 'yyyy-MM-dd')
)

$ErrorActionPreference = 'Stop'

# ── Paths ──────────────────────────────────────────────────────────
$ProjectRoot  = Resolve-Path "$PSScriptRoot\.."
$DataDir      = Join-Path $ProjectRoot 'data'
$BackupRoot   = Join-Path $ProjectRoot 'backups'
$DbFile       = Join-Path $DataDir 'app.db'
$LogFile      = Join-Path $ProjectRoot 'backup.log'
$BackupDir    = Join-Path $BackupRoot $BackupDate
$BackupFile   = Join-Path $BackupDir 'app.db'

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  "$timestamp  $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8
  Write-Host "$timestamp  $Message"
}

# ── Help ───────────────────────────────────────────────────────────
if ($BackupDate -eq '--help' -or $BackupDate -eq '-h') {
  Write-Host "Usage: .\restore-db.ps1 [-BackupDate YYYY-MM-DD]"
  Write-Host "  Restore SQLite DB from backups\<date>\app.db"
  Write-Host ""
  Write-Host "  -BackupDate YYYY-MM-DD  Date of backup to restore (default: today)"
  Write-Host ""
  Write-Host "  Available backups:"
  if (Test-Path -LiteralPath $BackupRoot) {
    Get-ChildItem -Path $BackupRoot -Directory |
      Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
      Sort-Object Name -Descending |
      ForEach-Object {
        $f = Join-Path $_.FullName 'app.db'
        if (Test-Path -LiteralPath $f) {
          $size = (Get-Item -LiteralPath $f).Length
          Write-Host "    $($_.Name)  ($size bytes)"
        }
      }
  }
  exit 0
}

# ── Pre-flight checks ─────────────────────────────────────────────
if (-not (Test-Path -LiteralPath $BackupFile)) {
  Write-Log "ERROR: Backup not found: $BackupFile"
  Write-Log "  Available backups:"
  if (Test-Path -LiteralPath $BackupRoot) {
    Get-ChildItem -Path $BackupRoot -Directory |
      Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
      Sort-Object Name -Descending |
      ForEach-Object {
        $f = Join-Path $_.FullName 'app.db'
        if (Test-Path -LiteralPath $f) {
          $size = (Get-Item -LiteralPath $f).Length
          Write-Log "    $($_.Name)  ($size bytes)"
        }
      }
  }
  exit 1
}

if (-not (Test-Path -LiteralPath $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

# ── Step 1: Stop backend process ──────────────────────────────────
Write-Log "Step 1: Stopping backend Node processes..."
$stopped = $false
Get-Process -Name 'node' -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    $_ | Stop-Process -Force -ErrorAction Stop
    $stopped = $true
  } catch {
    Write-Log "  WARNING: Could not stop process $($_.Id): $($_.Exception.Message)"
  }
}
if ($stopped) {
  Write-Log "  Stopped Node processes"
  Start-Sleep -Seconds 2
} else {
  Write-Log "  No Node processes running — skipping stop"
}

# ── Step 2: Backup current DB (safety net) ────────────────────────
Write-Log "Step 2: Backing up current DB (pre-restore safety)..."
$preRestoreFile = $null
if (Test-Path -LiteralPath $DbFile) {
  $preRestoreFile = "$DbFile.pre-restore-$((Get-Date).Ticks)"
  Copy-Item -LiteralPath $DbFile -Destination $preRestoreFile -Force
  $preSize = (Get-Item -LiteralPath $preRestoreFile).Length
  Write-Log "  Saved: $preRestoreFile ($preSize bytes)"
} else {
  Write-Log "  No existing DB to back up (fresh restore)"
}

# ── Step 3: Restore from backup ───────────────────────────────────
Write-Log "Step 3: Restoring $BackupFile -> $DbFile"
$backupSize = (Get-Item -LiteralPath $BackupFile).Length
$backupHash = (Get-FileHash -LiteralPath $BackupFile -Algorithm SHA256).Hash

$copySuccess = $false
$maxRetries = 3
for ($retry = 1; $retry -le $maxRetries; $retry++) {
  Copy-Item -LiteralPath $BackupFile -Destination $DbFile -Force
  $restoredSize = (Get-Item -LiteralPath $DbFile).Length
  $restoredHash = (Get-FileHash -LiteralPath $DbFile -Algorithm SHA256).Hash

  if ($restoredSize -ne $backupSize) {
    Write-Log "  WARNING: Size mismatch on attempt $retry (expected=$backupSize, got=$restoredSize)"
    Start-Sleep -Seconds 1
    continue
  }
  if ($restoredHash -ne $backupHash) {
    Write-Log "  WARNING: Hash mismatch on attempt $retry — file may still be locked"
    Start-Sleep -Seconds 1
    continue
  }
  $copySuccess = $true
  break
}

if (-not $copySuccess) {
  Write-Log "ERROR: Copy failed after $maxRetries attempts (size or hash mismatch)"
  Write-Log "  Rolling back..."
  Remove-Item -LiteralPath $DbFile -Force -ErrorAction SilentlyContinue
  if ($preRestoreFile -and (Test-Path -LiteralPath $preRestoreFile)) {
    Move-Item -LiteralPath $preRestoreFile -Destination $DbFile -Force
    Write-Log "  Previous DB restored from pre-restore backup."
  }
  exit 1
}
Write-Log "  Restored: $restoredSize bytes"

# ── Step 4: Verify integrity ──────────────────────────────────────
Write-Log "Step 4: Verifying integrity..."
$dbPathPosix = $DbFile -replace '\\', '/'

# integrity_check
try {
  $nodeScript = "const Database = require('better-sqlite3');" +
    "const db = new Database('$dbPathPosix');" +
    "const result = db.pragma('integrity_check');" +
    "const rows = Array.isArray(result) ? result : [{integrity_check: result}];" +
    "const failures = rows.filter(r => r.integrity_check !== 'ok' && !String(r.integrity_check).startsWith('ok'));" +
    "console.log(failures.length);" +
    "db.close();"
  $failCount = node -e $nodeScript 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Node integrity_check failed: $failCount"
  }
  $failCount = [int]$failCount.Trim()
  if ($failCount -eq 0) {
    Write-Log "  integrity_check: OK"
  } else {
    Write-Log "  ERROR: integrity_check found $failCount failure(s)"
    throw "integrity_check failed"
  }
} catch {
  Write-Log "  Rolling back..."
  Remove-Item -LiteralPath $DbFile -Force -ErrorAction SilentlyContinue
  if ($preRestoreFile -and (Test-Path -LiteralPath $preRestoreFile)) {
    Move-Item -LiteralPath $preRestoreFile -Destination $DbFile -Force
    Write-Log "  Previous DB restored from pre-restore backup."
  }
  exit 1
}

# quick_check
try {
  $nodeScript = "const Database = require('better-sqlite3');" +
    "const db = new Database('$dbPathPosix');" +
    "const result = db.pragma('quick_check');" +
    "console.log(JSON.stringify(result));" +
    "db.close();"
  $quickResult = node -e $nodeScript 2>&1
  if ($LASTEXITCODE -eq 0 -and $quickResult -match 'ok') {
    Write-Log "  quick_check: OK"
  } else {
    Write-Log "  WARNING: quick_check: $quickResult"
  }
} catch {
  Write-Log "  WARNING: quick_check error: $($_.Exception.Message)"
}

# ── Step 5: Restart backend ───────────────────────────────────────
Write-Log "Step 5: Backend restart..."
Write-Log "  To restart the backend, run:"
Write-Log "    cd $ProjectRoot && npm run dev:backend"
Write-Log "  Or if using PM2 in production:"
Write-Log "    pm2 start backend"

# ── Summary ────────────────────────────────────────────────────────
Write-Log "Restore complete: $BackupFile -> $DbFile ($restoredSize bytes)"
Write-Log "  Verify: curl http://localhost:3001/health"
exit 0

<#
.SYNOPSIS
  Daily SQLite database backup script (Windows / local dev).
  Copies backend/data/app.db to a timestamped local backup directory
  and optionally uploads to cloud storage (Aliyun OSS or AWS S3).

.DESCRIPTION
  - Creates consistent DB snapshot via PRAGMA wal_checkpoint before copy
  - Stores backups in backups/YYYY-MM-DD/app.db
  - Uploads to OSS/S3 when credentials are configured (production)
  - Cleans up local backups older than 30 days
  - Logs to backup.log

.PARAMETER CloudUpload
  Switch to enable cloud upload (off by default for local dev).

.EXAMPLE
  # Local backup only
  powershell -File backend/scripts/backup-db.ps1

  # With cloud upload
  powershell -File backend/scripts/backup-db.ps1 -CloudUpload
#>

param([switch]$CloudUpload)

$ErrorActionPreference = 'Stop'

# ── Paths ──────────────────────────────────────────────────────────
$ProjectRoot  = Resolve-Path "$PSScriptRoot\.."
$DataDir      = Join-Path $ProjectRoot 'data'
$BackupRoot   = Join-Path $ProjectRoot 'backups'
$DbFile       = Join-Path $DataDir 'app.db'
$LogFile      = Join-Path $ProjectRoot 'backup.log'
$DateStamp    = Get-Date -Format 'yyyy-MM-dd'
$BackupDir    = Join-Path $BackupRoot $DateStamp
$BackupFile   = Join-Path $BackupDir 'app.db'

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  "$timestamp  $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8
  Write-Host "$timestamp  $Message"
}

# ── Pre-flight checks ─────────────────────────────────────────────
if (-not (Test-Path -LiteralPath $DbFile)) {
  Write-Log "ERROR: Database not found at $DbFile"
  exit 1
}

# ── Step 1: Checkpoint WAL for consistency ────────────────────────
Write-Log "Step 1: Checkpointing WAL..."
try {
  $dbPathPosix = $DbFile -replace '\\', '/'
  $nodeScript = "const Database = require('better-sqlite3');" +
    "const db = new Database('$dbPathPosix');" +
    "db.pragma('wal_checkpoint(TRUNCATE)');" +
    "db.close();" +
    "console.log('OK');"
  $result = node -e $nodeScript 2>&1
  if ($LASTEXITCODE -ne 0 -or $result -notlike '*OK*') {
    throw "Node checkpoint failed: $result"
  }
  Write-Log "  WAL checkpoint: OK"
} catch {
  Write-Log "  WARNING: Could not checkpoint DB via Node ($($_.Exception.Message)). Proceeding with file copy."
}

# ── Step 2: Create backup directory and copy ──────────────────────
Write-Log "Step 2: Creating backup at $BackupDir"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Copy-Item -LiteralPath $DbFile -Destination $BackupFile -Force

# Verify size
$originalSize = (Get-Item -LiteralPath $DbFile).Length
$backupSize   = (Get-Item -LiteralPath $BackupFile).Length
if ($originalSize -ne $backupSize) {
  Write-Log "ERROR: Backup size mismatch (original=$originalSize, backup=$backupSize)"
  exit 1
}

Write-Log "  Backup file: $BackupFile ($backupSize bytes)"

# ── Step 3: Cloud upload (when enabled + credentials present) ────
if ($CloudUpload) {
  Write-Log "Step 3: Cloud upload..."

  $aliyunKey    = [Environment]::GetEnvironmentVariable('OSS_ACCESS_KEY_ID')
  $aliyunSecret = [Environment]::GetEnvironmentVariable('OSS_ACCESS_KEY_SECRET')
  $ossBucket    = [Environment]::GetEnvironmentVariable('OSS_BUCKET')
  $ossEndpoint  = [Environment]::GetEnvironmentVariable('OSS_ENDPOINT')

  $awsKey       = [Environment]::GetEnvironmentVariable('AWS_ACCESS_KEY_ID')
  $awsSecret    = [Environment]::GetEnvironmentVariable('AWS_SECRET_ACCESS_KEY')
  $s3Bucket     = [Environment]::GetEnvironmentVariable('S3_BUCKET')

  $uploaded = $false

  if ($aliyunKey -and $aliyunSecret -and $ossBucket) {
    # Aliyun OSS via ossutil
    $ossPath = "oss://$ossBucket/backups/$DateStamp/app.db"
    if (-not $ossEndpoint) { $ossEndpoint = 'oss-cn-hangzhou.aliyuncs.com' }
    $ossArgs = @('-i', $aliyunKey, '-k', $aliyunSecret, '-e', $ossEndpoint)
    & ossutil cp $BackupFile $ossPath @ossArgs 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Log "  Aliyun OSS: uploaded to $ossPath"
      $uploaded = $true
    } else {
      Write-Log "  WARNING: Aliyun OSS upload failed (exit code $LASTEXITCODE)"
    }
  } elseif ($awsKey -and $s3Bucket) {
    # AWS S3 via aws CLI
    $s3Path = "s3://$s3Bucket/backups/$DateStamp/app.db"
    & aws s3 cp $BackupFile $s3Path 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Log "  AWS S3: uploaded to $s3Path"
      $uploaded = $true
    } else {
      Write-Log "  WARNING: AWS S3 upload failed (exit code $LASTEXITCODE)"
    }
  } else {
    Write-Log "  WARNING: CloudUpload flag set but no cloud credentials found. Skipping."
  }

  # ── Cloud retention: delete backups older than 90 days ──────────
  if ($uploaded) {
    Write-Log "  Cloud retention: keeping last 90 days..."
    $cutoff = (Get-Date).AddDays(-90)
    if ($aliyunKey -and $ossBucket) {
      $remoteList = & ossutil ls "oss://$ossBucket/backups/" --output-format text 2>&1
      # ossutil output: YYYY-MM-DD HH:MM:SS  filesize  oss://bucket/backups/YYYY-MM-DD/app.db
      foreach ($line in $remoteList) {
        if ($line -match '(\d{4}-\d{2}-\d{2})') {
          $backupDate = Get-Date $matches[1]
          if ($backupDate -lt $cutoff) {
            $oldPath = "oss://$ossBucket/backups/$($matches[1])/app.db"
            & ossutil rm $oldPath 2>&1 | Out-Null
            Write-Log "    Deleted: $oldPath"
          }
        }
      }
    } elseif ($s3Bucket) {
      $remoteList = & aws s3 ls "s3://$s3Bucket/backups/" 2>&1
      foreach ($line in $remoteList) {
        if ($line -match '(\d{4}-\d{2}-\d{2})') {
          $backupDate = Get-Date $matches[1]
          if ($backupDate -lt $cutoff) {
            $oldPath = "s3://$s3Bucket/backups/$($matches[1])/app.db"
            & aws s3 rm $oldPath 2>&1 | Out-Null
            Write-Log "    Deleted: $oldPath"
          }
        }
      }
    }
  }
} else {
  Write-Log "Step 3: Cloud upload skipped (use -CloudUpload for production)"
}

# ── Step 4: Local retention — delete backups older than 30 days ────
Write-Log "Step 4: Local retention (keep last 30 days)..."
$cutoffLocal = (Get-Date).AddDays(-30)
Get-ChildItem -Path $BackupRoot -Directory | ForEach-Object {
  try {
    $dirDate = [DateTime]::ParseExact($_.Name, 'yyyy-MM-dd', $null)
    if ($dirDate -lt $cutoffLocal) {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
      Write-Log "  Deleted old backup: $($_.FullName)"
    }
  } catch {
    # Skip directories that don't match date format
  }
}

# ── Summary ────────────────────────────────────────────────────────
Write-Log "Backup complete: $BackupFile ($backupSize bytes)"
exit 0

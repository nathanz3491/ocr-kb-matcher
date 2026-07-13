$current = Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json' -Raw | ConvertFrom-Json
$backup = Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json.168nodes.backup' -Raw | ConvertFrom-Json

$script:ids1 = @{}
foreach ($p in $current.PSObject.Properties) {
  $n = $p.Value
  if ($n.id -and $n.id -match '^EA-([A-Z]{2})-(\d+)$') {
    $d = $Matches[1]
    if (-not $script:ids1.ContainsKey($d)) { $script:ids1[$d] = @() }
    $script:ids1[$d] += [int]$Matches[2]
  }
}

$script:ids2 = @{}
foreach ($p in $backup.PSObject.Properties) {
  $n = $p.Value
  if ($n.id -and $n.id -match '^EA-([A-Z]{2})-(\d+)$') {
    $d = $Matches[1]
    if (-not $script:ids2.ContainsKey($d)) { $script:ids2[$d] = @() }
    $script:ids2[$d] += [int]$Matches[2]
  }
}

Write-Host '=== CURRENT KG ==='
foreach ($d in ($script:ids1.Keys | Sort-Object)) {
  $arr = $script:ids1[$d] | Sort-Object
  $max = ($arr | Measure-Object -Maximum).Maximum
  $missing = @(1..$max | Where-Object { $_ -notin $arr })
  Write-Host ("  EA-{0}: {1} nodes | max={2} | missing=[{3}]" -f $d, $arr.Count, $max, ($missing -join ','))
}

Write-Host ''
Write-Host '=== BACKUP KG ==='
foreach ($d in ($script:ids2.Keys | Sort-Object)) {
  $arr = $script:ids2[$d] | Sort-Object
  $max = ($arr | Measure-Object -Maximum).Maximum
  $missing = @(1..$max | Where-Object { $_ -notin $arr })
  Write-Host ("  EA-{0}: {1} nodes | max={2} | missing=[{3}]" -f $d, $arr.Count, $max, ($missing -join ','))
}

Write-Host ''
Write-Host '=== MISSING IN CURRENT (in backup but not current) ==='
foreach ($d in ($script:ids2.Keys | Sort-Object)) {
  $backupNums = $script:ids2[$d]
  $currentNums = if ($script:ids1.ContainsKey($d)) { $script:ids1[$d] } else { @() }
  $diff = $backupNums | Where-Object { $_ -notin $currentNums }
  if ($diff) {
    Write-Host ("  EA-{0} missing: {1}" -f $d, ($diff -join ','))
  }
}
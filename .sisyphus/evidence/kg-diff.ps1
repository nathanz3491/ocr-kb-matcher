$json = Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json' -Raw | ConvertFrom-Json
$json.PSObject.Properties | ForEach-Object {
  $node = $_.Value
  if ($node.id -and $node.id -match '^EA-([A-Z]{2})-(\d+)$') {
    $domain = $Matches[1]
    $num = [int]$Matches[2]
    $script:ids[$domain] = @($script:ids[$domain]) + $num
  }
} | Out-Null

$script:ids = @{}
Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json' -Raw | ConvertFrom-Json |
  ForEach-Object { $_.PSObject.Properties } |
  ForEach-Object { $_.Value } |
  Where-Object { $_.id -and $_.id -match '^EA-([A-Z]{2})-(\d+)$' } |
  ForEach-Object {
    $domain = $Matches[1]
    $num = [int]$Matches[2]
    if (-not $script:ids.ContainsKey($domain)) { $script:ids[$domain] = @() }
    $script:ids[$domain] += $num
  }

Write-Host '=== CURRENT KG (by domain) ==='
foreach ($d in ($script:ids.Keys | Sort-Object)) {
  $arr = $script:ids[$d] | Sort-Object
  $max = ($arr | Measure-Object -Maximum).Maximum
  $missing = @(1..$max | Where-Object { $_ -notin $arr })
  Write-Host "  EA-$d : $($arr.Count) nodes | max=$max | missing=$(($missing -join ','))"
}

Write-Host ''
Write-Host '=== BACKUP KG (by domain) ==='
$script:ids2 = @{}
Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json.168nodes.backup' -Raw | ConvertFrom-Json |
  ForEach-Object { $_.PSObject.Properties } |
  ForEach-Object { $_.Value } |
  Where-Object { $_.id -and $_.id -match '^EA-([A-Z]{2})-(\d+)$' } |
  ForEach-Object {
    $domain = $Matches[1]
    $num = [int]$Matches[2]
    if (-not $script:ids2.ContainsKey($domain)) { $script:ids2[$domain] = @() }
    $script:ids2[$domain] += $num
  }
foreach ($d in ($script:ids2.Keys | Sort-Object)) {
  $arr = $script:ids2[$d] | Sort-Object
  $max = ($arr | Measure-Object -Maximum).Maximum
  $missing = @(1..$max | Where-Object { $_ -notin $arr })
  Write-Host "  EA-$d : $($arr.Count) nodes | max=$max | missing=$(($missing -join ','))"
}

Write-Host ''
Write-Host '=== MISSING IN CURRENT (in backup but not current) ==='
foreach ($d in ($script:ids2.Keys | Sort-Object)) {
  $backup = $script:ids2[$d]
  $current = if ($script:ids.ContainsKey($d)) { $script:ids[$d] } else { @() }
  $diff = $backup | Where-Object { $_ -notin $current }
  if ($diff) {
    Write-Host "  EA-$d missing: $($diff -join ',')"
  }
}
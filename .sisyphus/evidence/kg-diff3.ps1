$text1 = Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json' -Raw
$text2 = Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json.168nodes.backup' -Raw

$re = [regex]'"EA-([A-Z]{2})-(\d{3})"'
$ids1 = @{}
$re.Matches($text1) | ForEach-Object {
  $d = $_.Groups[1].Value
  $n = [int]$_.Groups[2].Value
  if (-not $ids1.ContainsKey($d)) { $ids1[$d] = New-Object System.Collections.Generic.HashSet[int] }
  [void]$ids1[$d].Add($n)
}
$ids2 = @{}
$re.Matches($text2) | ForEach-Object {
  $d = $_.Groups[1].Value
  $n = [int]$_.Groups[2].Value
  if (-not $ids2.ContainsKey($d)) { $ids2[$d] = New-Object System.Collections.Generic.HashSet[int] }
  [void]$ids2[$d].Add($n)
}

Write-Host '=== CURRENT KG ==='
foreach ($d in ($ids1.Keys | Sort-Object)) {
  $arr = $ids1[$d] | Sort-Object
  $max = if ($arr.Count -gt 0) { ($arr | Measure-Object -Maximum).Maximum } else { 0 }
  $missing = @(1..$max | Where-Object { $_ -notin $arr })
  Write-Host ("  EA-{0}: {1} nodes, max={2}, missing={3}" -f $d, $arr.Count, $max, ($missing -join ','))
}

Write-Host ''
Write-Host '=== BACKUP KG ==='
foreach ($d in ($ids2.Keys | Sort-Object)) {
  $arr = $ids2[$d] | Sort-Object
  $max = if ($arr.Count -gt 0) { ($arr | Measure-Object -Maximum).Maximum } else { 0 }
  $missing = @(1..$max | Where-Object { $_ -notin $arr })
  Write-Host ("  EA-{0}: {1} nodes, max={2}, missing={3}" -f $d, $arr.Count, $max, ($missing -join ','))
}

Write-Host ''
Write-Host '=== MISSING IN CURRENT (in backup but not current) ==='
foreach ($d in ($ids2.Keys | Sort-Object)) {
  $diff = $ids2[$d] | Where-Object { $ids1[$d] -eq $null -or -not $ids1[$d].Contains($_) }
  if ($diff) {
    Write-Host ("  EA-{0} missing: {1}" -f $d, ($diff -join ','))
  }
}
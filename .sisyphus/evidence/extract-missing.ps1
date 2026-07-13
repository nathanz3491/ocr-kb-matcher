$backup = Get-Content 'C:\Users\64887\ocr-kb-matcher\backend\data\knowledge-graph.json.168nodes.backup' -Raw | ConvertFrom-Json

$missing = @(
  'EA-CH-051',
  'EA-JP-031','EA-JP-032','EA-JP-033',
  'EA-KR-001','EA-KR-002','EA-KR-003','EA-KR-004','EA-KR-006','EA-KR-008','EA-KR-013'
)

Write-Host '=== MISSING NODES IN BACKUP ==='
foreach ($id in $missing) {
  $node = $backup.$id
  if ($node) {
    $name = $node.name
    $domain = $node.domain
    Write-Host "$id : $name | $domain"
  } else {
    Write-Host "$id : NOT FOUND IN BACKUP"
  }
}
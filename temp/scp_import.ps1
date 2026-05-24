$localPath = "C:\Users\64887\ocr-kb-matcher\frontend\app\(protected)\import\page.tsx"
$remotePath = "/home/nathan/ocr-kb-matcher/frontend/app/(protected)/import/page.tsx"
scp -i "C:\Users\64887\.ssh\id_ed25519" -P 6000 $localPath "nathan@139.199.220.244:$remotePath"

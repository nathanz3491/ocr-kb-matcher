curl.exe -s -o /dev/null -w 'GET /knowledge-graph -> %{http_code}\n' https://mastri.app/knowledge-graph > C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg.txt
curl.exe -s -o /dev/null -w 'GET /graph-editor -> %{http_code}\n' https://mastri.app/graph-editor >> C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg.txt
curl.exe -s 'https://mastri.app/api/knowledge-graph' >> C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg.txt 2>&1
type C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg.txt 2>&1 | head -30
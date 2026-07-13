curl.exe -s -o NUL -w "GET /knowledge-graph -> %%{http_code}\n" "https://mastri.app/knowledge-graph" > C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg.txt
curl.exe -s -o NUL -w "GET /graph-editor -> %%{http_code}\n" "https://mastri.app/graph-editor" >> C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg.txt
curl.exe -s "https://mastri.app/api/knowledge-graph" > C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg-data.txt 2>&1
type C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg.txt
echo === KG data sample ===
powershell -Command "Get-Content 'C:\Users\64887\ocr-kb-matcher\.sisyphus\evidence\verify-kg-data.txt' -TotalCount 200"
pause
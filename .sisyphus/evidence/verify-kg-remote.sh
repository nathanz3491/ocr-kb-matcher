for url in / /knowledge-graph /graph-editor /api/knowledge-graph; do
  echo -n "  https://mastri.app$url -> "
  curl -s -o /dev/null -w "%{http_code}\n" "https://mastri.app$url"
done
echo ""
echo "=== KG data sample ==="
curl -s 'https://mastri.app/api/knowledge-graph' | head -c 800
echo ""
echo "..."
echo ""
echo "=== Total nodes in live API ==="
curl -s 'https://mastri.app/api/knowledge-graph' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('nodes',[])))"
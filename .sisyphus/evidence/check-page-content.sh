curl -s 'https://mastri.app/knowledge-graph' | grep -oE 'KnowledgeGraphView|Knowledge Graph|nodes' | head -10
echo '---'
curl -s 'https://mastri.app/_next/static/chunks/app/(protected)/knowledge-graph/page.js' 2>&1 | head -c 200
echo '---'
curl -s 'https://mastri.app/knowledge-graph' | wc -c
echo 'page size'
#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH

# Find the actual directory with parentheses in its name
KG_DIR=$(find /home/nathan/ocr-kb-matcher/frontend/app -maxdepth 2 -name "knowledge-graph" -type d 2>/dev/null | head -1)
echo "Found knowledge-graph dir: $KG_DIR"

if [ -n "$KG_DIR" ]; then
    mv /home/nathan/kg_page.tsx "$KG_DIR/page.tsx"
    echo "Moved kg_page.tsx to $KG_DIR/page.tsx"
else
    echo "ERROR: knowledge-graph directory not found"
fi

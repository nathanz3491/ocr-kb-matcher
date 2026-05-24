#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
cd /home/nathan/ocr-kb-matcher/frontend
npx tsc --noEmit 2>&1 | head -40
echo "TSC_EXIT:$?"

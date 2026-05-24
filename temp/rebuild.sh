#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
cd /home/nathan/ocr-kb-matcher/frontend
npm run build
echo "EXIT:$?"

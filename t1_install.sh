#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
cd /home/nathan/ocr-kb-matcher/backend
npm install socket.io socket.io-client @types/socket.io
echo "EXIT_CODE: $?"

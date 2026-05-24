#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
cd /home/nathan/ocr-kb-matcher
pm2 restart frontend --update-env
sleep 3
pm2 list

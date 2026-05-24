#!/bin/bash
export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH
/home/nathan/.nvm/versions/node/v20.20.2/bin/pm2 logs frontend --lines 30 --nostream 2>&1 | tail -40

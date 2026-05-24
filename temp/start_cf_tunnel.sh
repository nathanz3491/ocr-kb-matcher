#!/bin/bash
LOG=/home/nathan/cf_tunnel.log
PIDFILE=/home/nathan/cf_tunnel.pid
BIN=/home/nathan/.nvm/versions/node/v20.20.2/lib/node_modules/cloudflared/bin/cloudflared

if [ -f "$PIDFILE" ]; then
    kill $(cat $PIDFILE) 2>/dev/null || true
    rm -f $PIDFILE
fi

echo "[$(date)] Starting tunnel to localhost:3000..." >> $LOG
$BIN tunnel --url http://localhost:3000 >> $LOG 2>&1 &
echo $! > $PIDFILE
echo "Tunnel started PID $(cat $PIDFILE)" >> $LOG

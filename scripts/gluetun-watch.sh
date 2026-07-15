#!/bin/bash
LOG=/var/log/gluetun-watch.log
WG_VPS="10.100.0.1"

# Check if gluetun container is running
if ! docker ps | grep -q gluetun; then
  echo "$(date): gluetun DOWN → start" >> $LOG
  docker start gluetun
  exit 0
fi

# Ping check with RETRY mechanism
# Attempt 1
if docker exec gluetun ping -c 3 -W 2 $WG_VPS >/dev/null 2>&1; then
  echo "$(date): WireGuard tunnel ping OK (Chk 1) ✓" >> $LOG
else
  # Wait and Retry (Attempt 2)
  echo "$(date): WireGuard tunnel ping KO (Chk 1). Retrying in 10s..." >> $LOG
  sleep 10
  if docker exec gluetun ping -c 5 -W 2 $WG_VPS >/dev/null 2>&1; then
    echo "$(date): WireGuard tunnel ping OK (Chk 2) ✓" >> $LOG
  else
    # FAILED twice → Restart
    echo "$(date): WireGuard tunnel ping KO (Chk 2) → restart" >> $LOG
    docker restart gluetun qbittorrent
  fi
fi

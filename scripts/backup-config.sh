#!/bin/bash
# Backup script for Server Config
# Creates a tar.gz containing:
# - .env (Secrets!)
# - docker-compose.yml
# - git history (so you have all versions)
# - scripts/

BACKUP_DIR="/opt/docker/.git-backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/server_config_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

# Cleanup old backups (keep last 5)
ls -dt "$BACKUP_DIR"/server_config_*.tar.gz | tail -n +6 | xargs -r rm

# Create backup
# We invoke tar from /opt/docker to keep paths relative
cd /opt/docker
tar -czf "$BACKUP_FILE" \
    .env \
    docker-compose.yml \
    scripts \
    README.md \
    .gitignore \
    .git

echo "Backup created at: $BACKUP_FILE"
echo "You should download this file to your local machine occasionally."

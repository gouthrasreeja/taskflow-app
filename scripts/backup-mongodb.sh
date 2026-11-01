#!/usr/bin/env bash
# Manual/scheduled backup of the Atlas database (the free M0 tier has NO automated backups).
# Requires MongoDB Database Tools (mongodump): https://www.mongodb.com/docs/database-tools/
# Usage:  MONGO_URI="mongodb+srv://..." ./scripts/backup-mongodb.sh
set -euo pipefail
: "${MONGO_URI:?Set MONGO_URI to the Atlas connection string}"
OUT="backups/taskflow-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
mongodump --uri="$MONGO_URI" --out="$OUT"
echo "Backup written to $OUT"
echo "Restore with: mongorestore --uri=\"\$MONGO_URI\" $OUT"

#!/usr/bin/env sh
# Nightly backup: a compressed database dump and the uploaded materials, kept for
# $KEEP_DAYS days. Run from cron (docs/DEPLOY.md), then copy deploy/backups off the server.
set -eu
cd "$(dirname "$0")"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H%M)"
mkdir -p backups

docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "backups/db_$STAMP.dump"
docker run --rm --user "$(id -u):$(id -g)" -v ai-academy_uploads:/data/uploads:ro -v "$PWD/backups:/backups" alpine \
  tar -czf "/backups/uploads_$STAMP.tar.gz" -C /data uploads

find backups -type f -mtime +"$KEEP_DAYS" -delete
echo "Backup written: backups/db_$STAMP.dump, backups/uploads_$STAMP.tar.gz"

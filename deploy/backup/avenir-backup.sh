#!/bin/sh
# Database backups in R2 (deploy/backup). Commands:
#   backup                    pg_dump (custom format) | gzip → daily/, on Sundays also weekly/;
#                             then keep the newest BACKUP_KEEP_DAILY / BACKUP_KEEP_WEEKLY
#   list                      every backup, newest first
#   restore <name> [database] download <name> (e.g. daily/avenir_2026-10-11_023000.dump.gz)
#                             and restore it into [database] (default PGDATABASE). Called by
#                             deploy/scripts/restore.sh, which asks for confirmation first.
# Connection: PGHOST/PGUSER/PGPASSWORD/PGDATABASE; bucket: BACKUP_S3_* (see .env.production).
set -eu
set -o pipefail

: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is not set}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is not set}"
: "${BACKUP_S3_ACCESS_KEY_ID:?BACKUP_S3_ACCESS_KEY_ID is not set}"
: "${BACKUP_S3_SECRET_ACCESS_KEY:?BACKUP_S3_SECRET_ACCESS_KEY is not set}"

# rclone remote "r2", configured from the environment only (nothing written to disk).
export RCLONE_CONFIG=/dev/null
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER="${BACKUP_S3_PROVIDER:-Cloudflare}"
export RCLONE_CONFIG_R2_ENDPOINT="$BACKUP_S3_ENDPOINT"
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
export RCLONE_CONFIG_R2_FORCE_PATH_STYLE="${BACKUP_S3_FORCE_PATH_STYLE:-false}"
REMOTE="r2:$BACKUP_S3_BUCKET"

log() { echo "[backup $(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }

# Deletes all but the newest $2 files in folder $1 (names sort by date).
prune() {
  rclone lsf "$REMOTE/$1/" --files-only 2>/dev/null | sort -r | tail -n "+$(($2 + 1))" |
    while read -r old; do
      log "Deleting $1/$old"
      rclone deletefile "$REMOTE/$1/$old"
    done
}

backup() {
  name="avenir_$(date +%Y-%m-%d_%H%M%S).dump.gz"
  file="/tmp/$name"
  trap 'rm -f "$file"' EXIT
  log "Dumping $PGDATABASE"
  # -Z0: gzip compresses once, below. --no-owner/--no-acl: restorable into any database.
  pg_dump --format=custom -Z0 --no-owner --no-acl | gzip -6 > "$file"
  # A dump that can't be listed can't be restored: fail loudly instead of uploading it.
  gunzip -c "$file" | pg_restore --list >/dev/null
  log "Uploading daily/$name ($(du -h "$file" | cut -f1))"
  rclone copyto "$file" "$REMOTE/daily/$name"
  if [ "$(date +%u)" = 7 ]; then
    log "Sunday: keeping a weekly copy"
    rclone copyto "$REMOTE/daily/$name" "$REMOTE/weekly/$name"
  fi
  prune daily "${BACKUP_KEEP_DAILY:-14}"
  prune weekly "${BACKUP_KEEP_WEEKLY:-8}"
  # Optional dead-man's switch (e.g. a free healthchecks.io check): pinged only on success.
  if [ -n "${BACKUP_PING_URL:-}" ]; then wget -q -O /dev/null "$BACKUP_PING_URL" || true; fi
  log "Done"
}

list() {
  for folder in daily weekly; do
    rclone lsf "$REMOTE/$folder/" --files-only --format "sp" --separator "  " 2>/dev/null |
      sort -r | sed "s#  #  $folder/#" | awk '{ printf "%-50s %8.1f MB\n", $2, $1 / 1048576 }'
  done
}

restore() {
  name="${1:?usage: restore <name> [database]}"
  target="${2:-$PGDATABASE}"
  case "$name" in daily/*.dump.gz | weekly/*.dump.gz) ;; *)
    echo "Not a backup name: $name (see: list)" >&2
    exit 1
    ;;
  esac
  file="/tmp/restore.dump.gz"
  trap 'rm -f "$file"' EXIT
  log "Downloading $name"
  rclone copyto "$REMOTE/$name" "$file"
  if [ "$target" != "$PGDATABASE" ]; then
    log "Creating a fresh database $target"
    dropdb --if-exists "$target"
    createdb "$target"
  fi
  log "Restoring into $target"
  gunzip -c "$file" | pg_restore --dbname="$target" --clean --if-exists --no-owner --no-acl \
    --single-transaction --exit-on-error
  log "Restored. Users: $(psql -d "$target" -Atc 'SELECT count(*) FROM "User"'), courses: $(psql -d "$target" -Atc 'SELECT count(*) FROM "Course"')"
}

case "${1:-}" in
  backup) backup ;;
  list) list ;;
  restore) shift; restore "$@" ;;
  *)
    echo "usage: avenir-backup backup | list | restore <name> [database]" >&2
    exit 64
    ;;
esac

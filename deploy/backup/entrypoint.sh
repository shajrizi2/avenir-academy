#!/bin/sh
# `cron` (default): run avenir-backup on BACKUP_SCHEDULE (in TZ). Anything else is passed to
# avenir-backup: `backup`, `list`, `restore <name> [database]` (see avenir-backup.sh).
set -eu

if [ "${1:-cron}" != "cron" ]; then
  exec avenir-backup "$@"
fi

# busybox crond starts jobs with an empty environment: hand the settings over in a file only
# root can read.
env | grep -E '^(PG|BACKUP_|TZ=|PATH=)' | sed "s/'/'\\\\''/g; s/=/='/; s/\$/'/; s/^/export /" > /run/backup.env
chmod 600 /run/backup.env

schedule="${BACKUP_SCHEDULE:-30 2 * * *}"
mkdir -p /etc/crontabs
echo "$schedule . /run/backup.env && /usr/local/bin/avenir-backup backup >/proc/1/fd/1 2>/proc/1/fd/2" > /etc/crontabs/root
echo "Backups scheduled: '$schedule' (${TZ:-UTC}) → r2:${BACKUP_S3_BUCKET:-?}"
exec crond -f -l 8

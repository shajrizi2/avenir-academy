#!/usr/bin/env bash
# Restores a database backup from R2.
#   deploy/scripts/restore.sh --list                      list backups, newest first
#   deploy/scripts/restore.sh <name> --into <database>    TEST restore into a scratch database
#                                                         (production is not touched)
#   deploy/scripts/restore.sh <name>                      restore OVER the live database
# <name> as shown by --list, e.g. daily/avenir_2026-10-11_023000.dump.gz
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

backup() { "$COMPOSE" run --rm --no-deps -T backup "$@"; }

case "${1:-}" in
  "" | -h | --help)
    sed -n '2,8p' "$0"
    exit 64
    ;;
  --list)
    "$COMPOSE" up -d --wait postgres
    backup list
    exit 0
    ;;
esac

NAME="$1"
"$COMPOSE" up -d --wait postgres

if [[ ${2:-} == --into ]]; then
  TARGET="${3:?--into needs a database name}"
  if [[ $TARGET == "$(env_value POSTGRES_DB avenir)" ]]; then
    echo "--into must be a scratch database, not the live one." >&2
    exit 1
  fi
  backup restore "$NAME" "$TARGET"
  echo
  echo "Test restore finished in database '$TARGET'. Look around with:"
  echo "  deploy/scripts/compose.sh exec postgres psql -U <POSTGRES_USER> $TARGET"
  echo "then drop it:"
  echo "  deploy/scripts/compose.sh exec postgres dropdb -U <POSTGRES_USER> $TARGET"
  exit 0
fi

cat <<WARN

  ###################################################################################
  #                                                                                 #
  #   DANGER: this REPLACES the LIVE production database with the backup            #
  #                                                                                 #
  #     $NAME
  #                                                                                 #
  #   Everything written since that backup (accounts, enrollments, attempts) is     #
  #   lost. The site is offline while it runs. A fresh backup of the current data   #
  #   is taken first, so this step can be undone.                                   #
  #                                                                                 #
  ###################################################################################

WARN
read -r -p "Type RESTORE PRODUCTION to continue: " answer
if [[ $answer != "RESTORE PRODUCTION" ]]; then
  echo "Cancelled; nothing changed."
  exit 1
fi

log "Safety backup of the current database"
backup backup

log "Stopping web and api"
"$COMPOSE" stop web api

log "Restoring $NAME"
status=0
if ! backup restore "$NAME"; then
  echo "Restore FAILED (it ran in one transaction, so the database is unchanged)." >&2
  status=1
fi

log "Starting api and web"
"$COMPOSE" up -d --wait api web
check_health
exit "$status"

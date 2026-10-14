#!/usr/bin/env bash
# Switches web and api back to an earlier image tag:
#   deploy/scripts/rollback.sh <tag>      e.g. the SHA in deploy/.image-tag.previous
#   deploy/scripts/rollback.sh            (no argument) = the previous tag
# Migrations are NOT undone: they only go forward. Rolling back over a migration works only
# if the old code can live with the new schema (adding columns/tables is fine; for a
# destructive change, restore a backup instead: deploy/scripts/restore.sh).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

TAG="${1:-$(cat "$DIR/.image-tag.previous" 2>/dev/null || true)}"
if [[ -z $TAG ]]; then
  echo "usage: rollback.sh <image-tag> (no previous tag recorded)" >&2
  exit 64
fi
CURRENT="$(cat "$DIR/.image-tag" 2>/dev/null || true)"
export IMAGE_TAG="$TAG"

log "Rolling back to $TAG (current: ${CURRENT:-unknown})"
pull_images api web
# --no-deps: skip the migrate job (the old migrations folder may lack the newest ones).
"$COMPOSE" up -d --no-deps --wait --wait-timeout 300 api web
"$COMPOSE" up -d --wait caddy
check_health
echo "$TAG" >"$DIR/.image-tag"
log "Now running $TAG"

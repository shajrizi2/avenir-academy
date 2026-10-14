#!/usr/bin/env bash
# Deploys image tag <tag> (a git SHA; "latest" also works):
#   1. pull the web, api and migrate images unless they are already here (ship.sh copies
#      them over SSH), and build the backup image
#   2. run database migrations (prisma migrate deploy)
#   3. start everything and wait until every container is healthy
#   4. check https://api.<domain>/api/v1/health and https://<domain>/ through Caddy
# If 3 or 4 fails, it rolls back to the previously deployed tag and exits non-zero.
# Called by .github/workflows/deploy.yml and deploy/scripts/ship.sh; you can also run it by
# hand on the server:
#   deploy/scripts/deploy.sh <tag>
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

TAG="${1:?usage: deploy.sh <image-tag>}"
PREVIOUS="$(cat "$DIR/.image-tag" 2>/dev/null || true)"
export IMAGE_TAG="$TAG"

log "Deploying $TAG (previous: ${PREVIOUS:-none})"
pull_images migrate api web
"$COMPOSE" build backup

log "Migrating the database"
"$COMPOSE" up -d --wait postgres
if ! "$COMPOSE" run --rm migrate; then
  # Nothing has been replaced yet: the old containers are still serving.
  echo "Migrations failed; the running version was left untouched." >&2
  exit 1
fi

log "Starting the new version"
if "$COMPOSE" up -d --wait --wait-timeout 300 --remove-orphans && check_health; then
  [[ -n $PREVIOUS && $PREVIOUS != "$TAG" ]] && echo "$PREVIOUS" >"$DIR/.image-tag.previous"
  echo "$TAG" >"$DIR/.image-tag"
  remove_old_images "$TAG" "$PREVIOUS"
  log "Deployed $TAG"
  exit 0
fi

"$COMPOSE" ps
"$COMPOSE" logs --tail 80 api web caddy || true
if [[ -n $PREVIOUS && $PREVIOUS != "$TAG" ]]; then
  log "Deploy failed: rolling back to $PREVIOUS"
  "$DIR/scripts/rollback.sh" "$PREVIOUS" || true
else
  echo "Deploy failed and there is no previous tag to roll back to." >&2
fi
exit 1

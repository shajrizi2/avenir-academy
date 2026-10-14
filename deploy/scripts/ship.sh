#!/usr/bin/env bash
# Deploys from your laptop, without GitHub Actions or a registry (run from anywhere in the repo):
#   1. run lint, type-check and the unit tests (skip with --skip-checks)
#   2. build the web, api and migrate images for the current commit
#   3. copy deploy/ and the images to the Droplet over SSH
#   4. run deploy/scripts/deploy.sh there: migrations, health checks, automatic rollback
#
#   deploy/scripts/ship.sh deploy@<droplet-ip> [--skip-checks] [--allow-dirty]
#
# The host can also come from SHIP_HOST. The image tag is the commit SHA, so commit first;
# --allow-dirty ships uncommitted changes under a "<sha>-dirty-<time>" tag.
# Build-time settings (baked into the web image): SITE_URL, NEXT_PUBLIC_API_URL,
# NEXT_PUBLIC_GA_ID (defaults: avenir.academy, api.avenir.academy, no analytics).
set -euo pipefail

HOST="${SHIP_HOST:-}"
CHECKS=1
ALLOW_DIRTY=0
for arg in "$@"; do
  case $arg in
    --skip-checks) CHECKS=0 ;;
    --allow-dirty) ALLOW_DIRTY=1 ;;
    -h | --help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*)
      echo "Unknown option $arg" >&2
      exit 64
      ;;
    *) HOST="$arg" ;;
  esac
done
if [[ -z $HOST ]]; then
  echo "usage: ship.sh deploy@<droplet-ip> [--skip-checks] [--allow-dirty]" >&2
  exit 64
fi

# For testing against a local stack, SHIP_SSH replaces ssh and SHIP_DIR the server folder.
SSH="${SHIP_SSH:-ssh}"
REMOTE_DIR="${SHIP_DIR:-/opt/avenir/deploy}"
SITE_URL="${SITE_URL:-https://avenir.academy}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.avenir.academy/api/v1}"
NEXT_PUBLIC_GA_ID="${NEXT_PUBLIC_GA_ID:-}"

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
remote() { "$SSH" "$HOST" "$@"; }

cd "$(git rev-parse --show-toplevel)"
TAG="$(git rev-parse --short=12 HEAD)"
if [[ -n $(git status --porcelain) ]]; then
  if ((!ALLOW_DIRTY)); then
    echo "You have uncommitted changes. Commit them first (or pass --allow-dirty)." >&2
    git status --short >&2
    exit 1
  fi
  TAG="$TAG-dirty-$(date +%Y%m%d%H%M%S)"
fi

log "Checking the server ($HOST)"
REGISTRY="$(remote "sed -n 's/^IMAGE_REGISTRY=//p' '$REMOTE_DIR/.env.production' 2>/dev/null | tail -1" |
  tr -d '"\r')"
if [[ -z $REGISTRY ]]; then
  echo "No IMAGE_REGISTRY in $HOST:$REMOTE_DIR/.env.production (docs/DEPLOY.md step 6)." >&2
  exit 1
fi
echo "Image names: $REGISTRY/avenir-{web,api,migrate}:$TAG"

if ((CHECKS)); then
  log "Lint, type-check and unit tests"
  pnpm lint
  pnpm type-check
  pnpm test
fi

log "Building the images"
build() { docker build --platform linux/amd64 "$@"; }
build -f apps/api/Dockerfile --target runner -t "$REGISTRY/avenir-api:$TAG" .
build -f apps/api/Dockerfile --target migrate -t "$REGISTRY/avenir-migrate:$TAG" .
build -f apps/web/Dockerfile --target runner -t "$REGISTRY/avenir-web:$TAG" \
  --build-arg SITE_URL="$SITE_URL" \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_GA_ID="$NEXT_PUBLIC_GA_ID" .

log "Copying deploy/ to $HOST:$REMOTE_DIR"
rsync -az --delete -e "$SSH" \
  --exclude .env.production --exclude '.env.local' --exclude '.image-tag*' --exclude backups/ \
  deploy/ "$HOST:$REMOTE_DIR/"

log "Copying the images (about 250 MB compressed)"
# docker save sends every layer, even ones the server already has; docker load skips those.
docker save "$REGISTRY/avenir-api:$TAG" "$REGISTRY/avenir-migrate:$TAG" \
  "$REGISTRY/avenir-web:$TAG" | gzip -1 | remote "gunzip | docker load"

log "Deploying $TAG"
remote "'$REMOTE_DIR/scripts/deploy.sh' '$TAG'"
log "Shipped $TAG to $HOST"

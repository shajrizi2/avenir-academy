# Shared helpers for deploy.sh and rollback.sh (sourced, not run).

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$DIR/scripts/compose.sh"

ENV_FILE="$(realpath "${ENV_FILE:-$DIR/.env.production}")"
export ENV_FILE

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# A value from the env file ($2 when it isn't set), the way the compose file reads it.
env_value() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-)"
  value="${value%\"}"
  value="${value#\"}"
  echo "${value:-${2:-}}"
}

# Checks the API health endpoint and the home page through Caddy on this machine (TLS,
# routing, web, api and database), retrying for about two minutes. Set SKIP_TLS_VERIFY=1
# for Caddy's local CA when testing on a laptop.
check_health() {
  local d port insecure=()
  d="$(env_value CADDY_DOMAIN)"
  port="$(env_value HTTPS_PORT 443)"
  if [[ ${SKIP_TLS_VERIFY:-0} == 1 ]]; then insecure=(-k); fi
  for _ in $(seq 1 24); do
    if curl -fsS "${insecure[@]}" --max-time 10 --resolve "api.$d:$port:127.0.0.1" \
      "https://api.$d:$port/api/v1/health" >/dev/null &&
      curl -fsS "${insecure[@]}" --max-time 10 --resolve "$d:$port:127.0.0.1" -o /dev/null \
        "https://$d:$port/"; then
      echo "Health checks passed: https://api.$d/api/v1/health and https://$d/"
      return 0
    fi
    sleep 5
  done
  echo "Health checks FAILED" >&2
  return 1
}

# Pulls the images of the given services (migrate, api, web) for $IMAGE_TAG, skipping the ones
# already on this server: an image copied over by ship.sh (no registry) or a tag deployed
# before. Git SHA tags never change, so a local copy is always current; `latest` is pulled.
pull_images() {
  local registry missing=() service
  registry="${IMAGE_REGISTRY:-$(env_value IMAGE_REGISTRY)}"
  for service in "$@"; do
    if [[ $IMAGE_TAG == latest ]] ||
      ! docker image inspect "$registry/avenir-$service:$IMAGE_TAG" >/dev/null 2>&1; then
      missing+=("$service")
    fi
  done
  if ((${#missing[@]})); then
    "$COMPOSE" pull "${missing[@]}"
  else
    echo "Images for $IMAGE_TAG are already on this server (not pulling)"
  fi
}

# Deletes the app images except the tags given (the current and the previous deploy), so old
# versions don't fill the disk. Images still used by a container are skipped.
remove_old_images() {
  local registry repo tag keep=("$@")
  registry="${IMAGE_REGISTRY:-$(env_value IMAGE_REGISTRY)}"
  for repo in avenir-web avenir-api avenir-migrate; do
    docker images "$registry/$repo" --format '{{.Tag}}' | while read -r tag; do
      [[ " ${keep[*]} " == *" $tag "* ]] && continue
      docker rmi "$registry/$repo:$tag" >/dev/null 2>&1 || true
    done
  done
  docker image prune -f >/dev/null
}

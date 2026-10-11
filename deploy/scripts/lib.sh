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

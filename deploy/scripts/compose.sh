#!/usr/bin/env bash
# `docker compose` for the production stack, with the env file and the deployed image tag.
# Every day-2 command goes through it, e.g.:
#   deploy/scripts/compose.sh ps
#   deploy/scripts/compose.sh logs -f api
#   deploy/scripts/compose.sh restart web
# ENV_FILE (default deploy/.env.production) and IMAGE_TAG (default: deploy/.image-tag) can be
# overridden; COMPOSE_OVERRIDE adds a second compose file (local testing).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$DIR/.env.production}"
if [[ ! -f $ENV_FILE ]]; then
  echo "Missing $ENV_FILE (copy .env.production.example, see docs/DEPLOY.md step 6)" >&2
  exit 1
fi
ENV_FILE="$(realpath "$ENV_FILE")"
# The deployed tag; without one, IMAGE_TAG from the env file (or `latest`) applies.
if [[ -z ${IMAGE_TAG:-} && -f $DIR/.image-tag ]]; then
  export IMAGE_TAG="$(<"$DIR/.image-tag")"
fi
# The services' env_file (resolved relative to deploy/).
export APP_ENV_FILE="$ENV_FILE"

files=(-f "$DIR/docker-compose.prod.yml")
if [[ -n ${COMPOSE_OVERRIDE:-} ]]; then files+=(-f "$COMPOSE_OVERRIDE"); fi
exec docker compose "${files[@]}" --project-directory "$DIR" --env-file "$ENV_FILE" "$@"

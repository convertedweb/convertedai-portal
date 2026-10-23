#!/usr/bin/env bash
# Droplet-oldali deploy. Az SSH kulcs `command=` korlátozásával hívódik, az image tag az
# SSH_ORIGINAL_COMMAND-ból jön (teljes commit SHA). Kézzel is futtatható: ./deploy.sh <sha>
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/convertedai-portal}"
COMPOSE=(docker compose -f docker-compose.production.yml)
TAG="${1:-${SSH_ORIGINAL_COMMAND:-}}"

if [[ ! "$TAG" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Érvénytelen image tag (teljes, 40 karakteres commit SHA kell)." >&2
  exit 2
fi

cd "$APP_DIR"
exec 9>.deploy.lock
flock -n 9 || { echo "Már fut egy deploy." >&2; exit 3; }

touch .env
OLD_TAG="$(sed -n 's/^PORTAL_IMAGE_TAG=//p' .env | tail -n 1)"

set_tag() {
  grep -v '^PORTAL_IMAGE_TAG=' .env > .env.tmp || true
  echo "PORTAL_IMAGE_TAG=$1" >> .env.tmp
  mv .env.tmp .env
}

healthy() {
  for _ in $(seq 1 15); do
    curl --fail --silent --max-time 5 http://127.0.0.1:3000/api/health >/dev/null && return 0
    sleep 2
  done
  return 1
}

echo "Deploy: ${OLD_TAG:-latest} -> $TAG"
set_tag "$TAG"

if "${COMPOSE[@]}" pull && "${COMPOSE[@]}" up -d --wait && healthy; then
  echo "Sikeres deploy: $TAG"
  exit 0
fi

echo "A deploy sikertelen, visszaállás: ${OLD_TAG:-latest}" >&2
if [[ -n "$OLD_TAG" ]]; then set_tag "$OLD_TAG"; else grep -v '^PORTAL_IMAGE_TAG=' .env > .env.tmp || true; mv .env.tmp .env; fi
"${COMPOSE[@]}" up -d --wait || echo "A visszaállítás is sikertelen, kézi beavatkozás kell." >&2
exit 1

#!/usr/bin/env bash
set -euo pipefail

image=${1:?Usage: smoke-container.sh <backend-image>}
suffix="${GITHUB_RUN_ID:-local}-$$"
network="ryczalt-smoke-${suffix}"
postgres="ryczalt-smoke-postgres-${suffix}"
backend="ryczalt-smoke-backend-${suffix}"

cleanup() {
  docker rm --force "$backend" "$postgres" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run --detach \
  --name "$postgres" \
  --network "$network" \
  --env POSTGRES_DB=ryczalt \
  --env POSTGRES_USER=ryczalt \
  --env POSTGRES_PASSWORD=runtime-smoke-test-only \
  --health-cmd 'pg_isready -U ryczalt -d ryczalt' \
  --health-interval 2s \
  --health-timeout 3s \
  --health-retries 30 \
  postgres:18.6-bookworm >/dev/null

echo "Waiting for temporary PostgreSQL to become healthy..."
for _ in $(seq 1 60); do
  state=$(docker inspect --format '{{.State.Health.Status}}' "$postgres")
  if [[ "$state" == "healthy" ]]; then
    break
  fi
  if [[ "$state" == "unhealthy" ]]; then
    docker logs "$postgres"
    exit 1
  fi
  sleep 1
done
if [[ "$(docker inspect --format '{{.State.Health.Status}}' "$postgres")" != "healthy" ]]; then
  docker logs "$postgres"
  echo "Temporary PostgreSQL did not become healthy within 60 seconds." >&2
  exit 1
fi

docker run --detach \
  --name "$backend" \
  --network "$network" \
  --publish 127.0.0.1::8080 \
  --env DATABASE_URL=jdbc:postgresql://"$postgres":5432/ryczalt \
  --env DATABASE_USER=ryczalt \
  --env DATABASE_PASSWORD=runtime-smoke-test-only \
  --env RYCZALT_TOKEN_SECRET=runtime-smoke-test-only-token-secret \
  --env RYCZALT_INTEGRATION_MASTER_KEY=runtime-smoke-test-only-master-key \
  "$image" >/dev/null

port_mapping=$(docker port "$backend" 8080/tcp | head -n 1)
port=${port_mapping##*:}
health_url="http://127.0.0.1:${port}/actuator/health"
echo "Waiting up to 90 seconds for backend health at ${health_url}..."
for _ in $(seq 1 45); do
  if response=$(curl --silent --show-error --fail --max-time 2 "$health_url" 2>/dev/null) \
      && [[ "$response" =~ \"status\"[[:space:]]*:[[:space:]]*\"UP\" ]]; then
    echo "Backend container is healthy: $response"
    exit 0
  fi
  if [[ "$(docker inspect --format '{{.State.Running}}' "$backend")" != "true" ]]; then
    docker logs "$backend"
    echo "Backend container exited before becoming healthy." >&2
    exit 1
  fi
  sleep 2
done

docker logs "$backend"
echo "Backend container did not report UP within 90 seconds." >&2
exit 1

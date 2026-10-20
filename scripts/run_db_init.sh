#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"
DB_ENV_FILE="$ROOT_DIR/database/config/.env"
SQL_FILE="${1:-$ROOT_DIR/database/scripts/01_init_database.sql}"

set -a
# shellcheck disable=SC1090
source "$DB_ENV_FILE"
set +a

: "${POSTGRES_USER:=postgres}"
: "${APP_DB:=smartflightcompanion_dev}"


echo "Applying SQL: $SQL_FILE"
docker exec -i database psql -U "$POSTGRES_USER" -d "$APP_DB" -v ON_ERROR_STOP=1 < "$SQL_FILE"

echo "Verifying seed counts..."
docker exec -i database psql -U "$POSTGRES_USER" -d "$APP_DB" -c 'select count(*) as airports from "Airports";'
docker exec -i database psql -U "$POSTGRES_USER" -d "$APP_DB" -c 'select count(*) as flights from "Flights";'

echo "DB init completed successfully."
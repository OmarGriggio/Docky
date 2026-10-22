#!/bin/sh
# Weekly reset of the demo company's data - installed in the ubuntu user's
# crontab on the VPS (see CLAUDE.md's Deployment section), not run in CI.
# Runs reset-demo-company.sql inside the running postgres container, using
# that container's own POSTGRES_USER/POSTGRES_DB env vars so this script
# never needs its own copy of the DB credentials.
# Then purges the demo company's files from MinIO (logo, header image,
# project attachments) through the backend container, which already has the
# S3 credentials - only once the SQL has succeeded (set -e). Needs the prod
# image (it runs the compiled dist/ script).

set -eu

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

set -a
# shellcheck disable=SC1091
. "$REPO_DIR/.env"
set +a

docker exec -i "$POSTGRES_CONTAINER_NAME" sh -c 'psql -v ON_ERROR_STOP=1 -1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    < "$REPO_DIR/scripts/reset-demo-company.sql"

# Only once the rows pointing at them are gone (the SQL above) - the files
# themselves live in MinIO, which the backend container already has the
# credentials for.
docker exec "$BACKEND_CONTAINER_NAME" node dist/shared/storage/purge-company-files.js 2

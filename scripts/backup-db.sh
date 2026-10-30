#!/bin/sh
# Nightly database backup - installed in the ubuntu user's crontab on the VPS
# (see zz_docs/Deployment.md), not run in CI. Three steps, any failure stops
# the run and posts to the Discord channel the error log already uses:
#
# 1. pg_dump of the live database into a dated file under BACKUP_DIR
#    (custom format, compressed), outside the repo and outside any container.
# 2. That file restored into a second, separate Postgres (the
#    postgres-backup service in docker-compose.prod.yml) and checked - a
#    backup nobody ever restored is not known to work; this proves every
#    night's one does, and leaves yesterday's data queryable there.
# 3. Dumps older than KEEP_DAYS deleted.
#
# Point-in-time copies, not a live replica: a mistake (a bad migration, a
# wrong delete) is only in tomorrow's copy, today's is still clean. Same
# server though - this protects against mistakes, not against losing the VPS.
#
# Uses each container's own POSTGRES_USER/POSTGRES_DB (same pattern as
# reset-demo-cron.sh), so it never needs its own copy of the credentials.

set -eu

# The dumps hold every company's data and the password hashes - readable by
# this user only, whatever umask cron starts with.
umask 077

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/docky-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STEP="start"

# Set up before anything else can fail (a missing .env included), so every
# failure is announced. The message names the step only - details are in
# the log on the server.
notify_failure() {
    webhook="$(grep '^DISCORD_WEBHOOK_URL=' "$REPO_DIR/backend/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'"'" || true)"
    if [ -n "$webhook" ]; then
        # Accents and the emoji as JSON escapes: a byte outside ASCII on a
        # command line depends on the locale cron runs with. The URL is
        # passed through stdin, not as an argument - an argument is visible
        # to every local user in the process list.
        printf 'url = "%s"\n' "$webhook" | curl -s -m 10 -K - -H "Content-Type: application/json" \
            -d "{\"content\":\"\\ud83d\\udd34 **Sauvegarde de la base \\u00e9chou\\u00e9e** (\\u00e9tape : $STEP) - voir backup.log sur le serveur.\",\"allowed_mentions\":{\"parse\":[]}}" \
            > /dev/null || true
    fi
}

on_exit() {
    status=$?
    rm -f "$BACKUP_DIR"/docky-*.dump.part
    if [ "$status" -ne 0 ]; then
        echo "$(date '+%F %T') FAILED at step '$STEP' (exit $status)"
        # A dump that didn't restore or pass the check must not sit among
        # the good ones looking like one of them.
        if [ "$STEP" = "restore" ] || [ "$STEP" = "check" ]; then
            [ -f "${DUMP:-}" ] && mv "$DUMP" "$DUMP.unverified"
        fi
        notify_failure
    fi
}
trap on_exit EXIT

STEP="config"
set -a
# shellcheck disable=SC1091
. "$REPO_DIR/.env"
set +a

BACKUP_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME}-backup"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
DUMP="$BACKUP_DIR/docky-$(date +%F).dump"

# count <container> <database name suffix> <query> - the database is the
# container's own POSTGRES_DB, plus the suffix.
count() {
    docker exec "$1" sh -c "psql -U \"\$POSTGRES_USER\" -d \"\${POSTGRES_DB}$2\" -tAc \"$3\""
}

STEP="dump"
# Read just before the dump, not after the restore: a redeploy applying a
# migration in between would otherwise look like a broken backup.
LIVE_MIGRATIONS="$(count "$POSTGRES_CONTAINER_NAME" "" 'SELECT count(*) FROM schema_migrations')"
# Written under a temporary name first: a dump interrupted halfway never
# looks like a finished one (and is removed on exit).
docker exec "$POSTGRES_CONTAINER_NAME" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DUMP.part"
mv "$DUMP.part" "$DUMP"

STEP="restore"
# Into a scratch database first (<db>_incoming): the backup database keeps
# yesterday's copy until tonight's has restored and passed the check - a
# dump that turns out broken never wipes the last good copy.
docker exec "$BACKUP_CONTAINER_NAME" sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "${POSTGRES_DB}_incoming" && createdb -U "$POSTGRES_USER" "${POSTGRES_DB}_incoming"'
docker exec -i "$BACKUP_CONTAINER_NAME" sh -c 'pg_restore -U "$POSTGRES_USER" -d "${POSTGRES_DB}_incoming" --no-owner --exit-on-error' < "$DUMP"

STEP="check"
# The restored copy must hold what the live database held: every migration
# applied and at least one company.
BACKUP_MIGRATIONS="$(count "$BACKUP_CONTAINER_NAME" "_incoming" 'SELECT count(*) FROM schema_migrations')"
BACKUP_COMPANIES="$(count "$BACKUP_CONTAINER_NAME" "_incoming" 'SELECT count(*) FROM companies')"
if [ "$BACKUP_MIGRATIONS" -lt "$LIVE_MIGRATIONS" ] || [ "$BACKUP_COMPANIES" -lt 1 ]; then
    echo "check failed: migrations $BACKUP_MIGRATIONS/$LIVE_MIGRATIONS, companies $BACKUP_COMPANIES"
    exit 1
fi

STEP="swap"
# Only now does tonight's copy replace yesterday's.
docker exec "$BACKUP_CONTAINER_NAME" sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB" && psql -q -U "$POSTGRES_USER" -d postgres -c "ALTER DATABASE \"${POSTGRES_DB}_incoming\" RENAME TO \"$POSTGRES_DB\""'

STEP="cleanup"
# About KEEP_DAYS days' worth - find counts whole days of age. An
# .unverified dump ages out the same way.
find "$BACKUP_DIR" -name 'docky-*.dump*' -mtime +"$((KEEP_DAYS - 1))" -delete

echo "$(date '+%F %T') OK $(basename "$DUMP") ($(du -h "$DUMP" | cut -f1)), restored and checked"

#!/usr/bin/env bash
# Throwaway local Postgres test of the admin-dashboard migration. Touches nothing on Supabase.
# Needs Postgres 15+ binaries (initdb, pg_ctl, psql). Usage: bash tests/db/run.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
AS=""
if [ "$(id -u)" = "0" ]; then AS="runuser -u postgres --"; chown postgres "$WORK"; fi
cleanup() { $AS "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

$AS "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
$AS "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
PSQL=("$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

cp "$HERE/fixture.sql" "$HERE/admin_dashboard_test.sql" "$ROOT"/supabase/migrations/*.sql "$WORK/"
chmod a+r "$WORK"/*.sql
$AS "${PSQL[@]}" -f "$WORK/fixture.sql"
for m in "$ROOT"/supabase/migrations/*.sql; do $AS "${PSQL[@]}" -f "$WORK/$(basename "$m")"; done
# Applying the migration twice must also work (safe to re-run).
for m in "$ROOT"/supabase/migrations/*.sql; do $AS "${PSQL[@]}" -f "$WORK/$(basename "$m")"; done
PGOPTIONS="" $AS "${PSQL[@]}" -f "$WORK/admin_dashboard_test.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'

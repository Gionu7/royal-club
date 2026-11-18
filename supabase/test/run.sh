#!/usr/bin/env bash
# Runs schema.sql twice (it must be re-runnable) against a throwaway Postgres
# cluster, then checks what each role can and cannot do.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
[ -n "$bin" ] || bin="$(dirname "$(command -v pg_ctl)")"
tmp="$(mktemp -d)"
port=$((50000 + RANDOM % 10000))
run_pg() { if [ "$(id -u)" = 0 ]; then chown -R postgres "$tmp"; su postgres -c "$*"; else bash -c "$*"; fi; }
cleanup() { run_pg "'$bin/pg_ctl' -D '$tmp/data' -m immediate stop" >/dev/null 2>&1 || true; rm -rf -- "$tmp"; }
trap cleanup EXIT
run_pg "'$bin/initdb' -D '$tmp/data' -U postgres -A trust >/dev/null"
run_pg "'$bin/pg_ctl' -D '$tmp/data' -o '-p $port -k $tmp' -l '$tmp/log' -w start >/dev/null"
psql_() { psql -h "$tmp" -p $port -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql_ -f "$here/auth-stub.sql"
psql_ -f "$here/../schema.sql"
psql_ -f "$here/../schema.sql"
psql_ -f "$here/rls-test.sql"

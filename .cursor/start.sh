#!/usr/bin/env bash
# Per-boot startup: ensure the local PostgreSQL server is running before the
# dev server (started via the `dev` terminal) connects to it. Idempotent —
# starting an already-running cluster is a no-op.
set -euo pipefail

sudo service postgresql start || true

for _ in $(seq 1 30); do
  if pg_isready -qh localhost -p 5432; then
    echo "PostgreSQL is ready."
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready in time." >&2
exit 1

#!/usr/bin/env bash
# Idempotent Cloud Agent setup for the waitlist Next.js app.
#
# Responsibilities (durable, source-derived state — captured in the build
# snapshot): install a local PostgreSQL, provision the dev database, write a
# local .env, install node dependencies, and sync the Prisma schema.
# Per-boot service startup lives in start.sh.
set -euo pipefail

DB_NAME="waitlist"
DB_USER="postgres"
DB_PASS="postgres"

cd "$(dirname "$0")/.."

# 1. System dependency: PostgreSQL. Installed here so it is captured in the
#    environment snapshot rather than re-downloaded on every boot.
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

# 2. Start the server so we can provision the DB and push the schema. Starting
#    an already-running cluster is a no-op.
sudo service postgresql start || true
for _ in $(seq 1 30); do
  if pg_isready -qh localhost -p 5432; then break; fi
  sleep 1
done

# 3. Provision the role password and database (idempotent).
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" | grep -q 1; then
  sudo -u postgres createdb "${DB_NAME}"
fi

# 4. Local env file (git-ignored). Only created when missing so manual edits
#    (e.g. adding Resend keys) survive re-runs.
if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
DIRECT_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
WAITLIST_APP_NAME="Trenchers"
# Optional: set RESEND_API_KEY + RESEND_FROM_EMAIL to enable OTP / transactional
# emails. Without them the OTP send is skipped (/api/waitlist returns 503) but
# the generated code is still persisted, so the verification flow can be
# exercised locally by reading WaitlistSubscriber.otpCode from the database.
EOF
fi

# 5. Node dependencies. postinstall runs \`prisma generate\`.
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

# 6. Sync the Prisma schema to the local database.
pnpm prisma:push

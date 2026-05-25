#!/usr/bin/env bash
# Cron entry point for the paced survey send (invites + reminders folded into
# one drip). Cron runs with a minimal environment, so we set PATH to the nvm
# node bin and cd into the repo so `dotenv/config` finds .env. Each run sends
# one chunk; idempotent via sentAt / reminderSentAt. Output is appended to a
# log you can tail.
#
# Install (every 16 min ≈ 1,934 people over ~10h at 50/run):
#   crontab -e
#   */16 * * * * /home/prakhar/trenchers/waitlist-v3/scripts/cron-send.sh 50
#
# Remove when done:  crontab -e  (delete the line)
# Watch progress:    tail -f /tmp/survey-cron.log
set -euo pipefail

export PATH="/home/prakhar/.nvm/versions/node/v24.10.0/bin:/usr/local/bin:/usr/bin:/bin"
REPO="/home/prakhar/trenchers/waitlist-v3"
LIMIT="${1:-50}"

cd "$REPO"
exec node_modules/.bin/tsx scripts/send-survey-chunk.ts --send --limit "$LIMIT" \
  >> /tmp/survey-cron.log 2>&1

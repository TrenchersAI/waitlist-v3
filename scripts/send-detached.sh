#!/usr/bin/env bash
# Launches a send run fully detached from the calling shell.
#
# A multi-hour send started as a normal background job dies with its parent.
# That already happened once: the run was killed partway through wave 1 when
# the controlling process exited, leaving 1,117 recipients unsent. setsid
# plus nohup reparents the sender to init so it survives the terminal, the
# session, and the agent that started it.
#
# Losing the process is not a correctness problem, because every recipient is
# stamped as sent the moment Resend accepts them and the sender skips anyone
# already stamped. A killed run is resumable by re-running with the same
# arguments. It is an availability problem, which is what this fixes.
#
#   ./scripts/send-detached.sh --wave wave-1-completed --limit 1117 \
#     --batch 40 --per-hour 319 --send
#
# Progress: tail -f /tmp/beta-send.log
# Stop it:  pkill -f send-beta-invites

set -euo pipefail
cd "$(dirname "$0")/.."

LOG=/tmp/beta-send.log
: > "$LOG"

setsid nohup node_modules/.bin/tsx scripts/send-beta-invites.ts "$@" \
  >> "$LOG" 2>&1 < /dev/null &

PID=$!
disown "$PID" 2>/dev/null || true
sleep 3

echo "launched detached, pid $PID"
echo "log: $LOG"
echo
head -12 "$LOG" || true

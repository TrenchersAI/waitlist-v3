#!/usr/bin/env bash
# Launches a send run fully detached from the calling shell.
#
# A multi-hour send started as an ordinary background job dies with its
# parent. That already happened once: the wave-1 run was killed partway
# through when the controlling process exited, leaving 1,117 recipients
# unsent with no error and no signal. setsid plus nohup reparents the sender
# to init so it survives the terminal, the shell, and the agent that started
# it.
#
# Losing the process is not a correctness problem, because every recipient is
# stamped the moment Resend accepts them and the senders skip anyone already
# stamped, so an interrupted run resumes by re-running with the same
# arguments. It is an availability problem, and a silent one, which is what
# this fixes.
#
#   ./scripts/send-detached.sh send-beta-invites.ts --wave wave-1-completed --send
#   ./scripts/send-detached.sh send-beta-reminder.ts --batch 40 --hours 1 --send
#
# Progress: tail -f /tmp/beta-send.log
# Stop it:  pkill -f <script name>

set -euo pipefail
cd "$(dirname "$0")/.."

SCRIPT="${1:?usage: send-detached.sh <script.ts> [args...]}"
shift

if [[ ! -f "scripts/${SCRIPT}" ]]; then
  echo "no such script: scripts/${SCRIPT}" >&2
  exit 1
fi

LOG=/tmp/beta-send.log
: > "$LOG"

setsid nohup node_modules/.bin/tsx "scripts/${SCRIPT}" "$@" \
  >> "$LOG" 2>&1 < /dev/null &

PID=$!
disown "$PID" 2>/dev/null || true
sleep 4

echo "launched ${SCRIPT} detached, pid $PID"
echo "log: $LOG"
echo
head -14 "$LOG" || true

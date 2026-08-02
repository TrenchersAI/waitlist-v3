#!/usr/bin/env bash
# Keeps a port-forward to the production st-api alive for the duration of a
# send run.
#
# The production LoadBalancer (4.182.3.94) is not reachable from a laptop,
# so access grants have to go through the cluster. `kubectl port-forward`
# drops on idle or a network blip, and a multi-hour send has to survive
# that, so restart it whenever it exits.
#
# A dropped forward is not a correctness problem: the sender verifies every
# grant against login_whitelist before mailing, so an unreachable API means
# those recipients are skipped and stay pending for the next run. It is a
# throughput problem, which is what this fixes.
#
#   ./scripts/pf-supervise.sh 18090
set -u
PORT="${1:-18090}"
LOG=/tmp/pf.log

while true; do
  kubectl -n trenchers port-forward "svc/st-api" "${PORT}:80" >> "$LOG" 2>&1
  echo "$(date -Is) port-forward exited, restarting in 3s" >> "$LOG"
  sleep 3
done

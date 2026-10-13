#!/usr/bin/env bash
# Start/status/stop the Expo web dev server for Yonks verification.
# Records the PID it started in .expo/verify-dev-server.env so `stop` kills
# exactly what `start` launched — never kill by process name.
#
# Usage:
#   helpers/dev-server.sh start [port]   # default 8081; reuses a healthy server
#   helpers/dev-server.sh status [port]
#   helpers/dev-server.sh stop
set -u
REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
ENV_FILE="$REPO/.expo/verify-dev-server.env"

status_port() {
  local port="$1"
  local body
  body="$(curl -s --max-time 3 "http://localhost:$port/status" || true)"
  if [ "$body" = "packager-status:running" ]; then
    echo "running"
  else
    echo "down"
  fi
}

# bun run web spawns expo → node; kill the recorded pid's whole descendant
# tree (lineage-based, never name-based) or Metro survives as an orphan.
descendants() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    descendants "$child"
    echo "$child"
  done
}

case "${1:-}" in
  start)
    PORT="${2:-8081}"
    if [ "$(status_port "$PORT")" = "running" ]; then
      echo "dev-server: already running on port $PORT (pre-existing — not recorded, stop will not kill it)"
      exit 0
    fi
    mkdir -p "$REPO/.expo"
    LOG_FILE="$REPO/.expo/verify-dev-server.log"
    # No CI=1: output is redirected (non-TTY), so expo is already
    # non-interactive, and CI mode would disable Metro's file watcher.
    (cd "$REPO" && bun run web --port "$PORT" >"$LOG_FILE" 2>&1) &
    local_pid=$!
    echo "$local_pid $PORT" >"$ENV_FILE"
    for _ in $(seq 1 60); do
      if [ "$(status_port "$PORT")" = "running" ]; then
        echo "dev-server: ready on http://localhost:$PORT (pid $local_pid, log $LOG_FILE)"
        exit 0
      fi
      kill -0 "$local_pid" 2>/dev/null || {
        echo "dev-server: process $local_pid exited during boot — log tail:" >&2
        tail -15 "$LOG_FILE" >&2
        exit 1
      }
      sleep 1
    done
    echo "dev-server: port $PORT never answered /status within 60s — log tail:" >&2
    tail -15 "$LOG_FILE" >&2
    exit 1
    ;;
  status)
    PORT="${2:-8081}"
    echo "packager: $(status_port "$PORT")"
    if [ -f "$ENV_FILE" ]; then
      read -r pid recorded_port <"$ENV_FILE"
      if kill -0 "$pid" 2>/dev/null; then
        echo "ours: pid $pid on port $recorded_port"
      else
        echo "ours: recorded pid $pid is dead"
      fi
    else
      echo "ours: none recorded by this skill"
    fi
    ;;
  stop)
    if [ ! -f "$ENV_FILE" ]; then
      echo "dev-server: nothing recorded — nothing to stop"
      exit 0
    fi
    read -r pid port <"$ENV_FILE"
    if kill -0 "$pid" 2>/dev/null; then
      for d in $(descendants "$pid"); do
        kill "$d" 2>/dev/null
      done
      kill "$pid" 2>/dev/null
      for _ in $(seq 1 10); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 1
      done
      if kill -0 "$pid" 2>/dev/null; then
        for d in $(descendants "$pid"); do
          kill -9 "$d" 2>/dev/null
        done
        kill -9 "$pid" 2>/dev/null
      fi
      echo "dev-server: stopped pid $pid tree (port $port)"
    else
      echo "dev-server: recorded pid $pid already gone"
    fi
    rm -f "$ENV_FILE"
    ;;
  *)
    echo "usage: $0 {start [port]|status [port]|stop}" >&2
    exit 2
    ;;
esac

#!/usr/bin/env bash
# Always-on Booky preview: HTTP server + Cloudflare tunnel with auto-restart.
# Writes booky/preview-status.json so preview-hub.html always has fresh links.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"
LOG_DIR="$ROOT/.preview"
STATUS_FILE="$ROOT/booky/preview-status.json"
mkdir -p "$LOG_DIR"

write_status() {
  local tunnel_base="${1:-}"
  local tunnel_ok="${2:-false}"
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  python3 - "$STATUS_FILE" "$PORT" "$tunnel_base" "$tunnel_ok" "$ts" <<'PY'
import json, sys
path, port, tunnel, ok, ts = sys.argv[1:6]
local = f"http://localhost:{port}"
data = {
  "updated": ts,
  "local": {
    "hub": f"{local}/booky/preview-hub.html",
    "win": f"{local}/booky/?preview=win",
    "game": f"{local}/booky/",
  },
  "tunnelOk": ok == "true",
}
if tunnel:
  base = tunnel.rstrip("/")
  data["tunnel"] = {
    "base": base,
    "hub": f"{base}/booky/preview-hub.html",
    "win": f"{base}/booky/?preview=win",
    "game": f"{base}/booky/",
  }
with open(path, "w") as f:
  json.dump(data, f, indent=2)
PY
}

start_http() {
  if curl -sf "http://127.0.0.1:${PORT}/booky/preview-hub.html" >/dev/null 2>&1; then
    return 0
  fi
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 0.3
  fi
  cd "$ROOT"
  nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >>"$LOG_DIR/http.log" 2>&1 &
  echo $! > "$LOG_DIR/http.pid"
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${PORT}/booky/preview-hub.html" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}

start_tunnel() {
  pkill -f "cloudflared tunnel --url http://127.0.0.1:${PORT}" 2>/dev/null || true
  sleep 0.5
  : > "$LOG_DIR/tunnel.log"
  cd "$ROOT"
  nohup npx --yes cloudflared tunnel --url "http://127.0.0.1:${PORT}" >>"$LOG_DIR/tunnel.log" 2>&1 &
  echo $! > "$LOG_DIR/tunnel.pid"
  local url=""
  for _ in $(seq 1 60); do
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | head -1 || true)
    if [[ -n "$url" ]]; then
      echo "$url"
      return 0
    fi
    sleep 0.5
  done
  return 1
}

echo "[preview-daemon] starting (port ${PORT})"
write_status "" false

while true; do
  start_http || echo "[preview-daemon] HTTP server failed, retrying…"

  tunnel_url=""
  if tunnel_url="$(start_tunnel)"; then
    echo "[preview-daemon] tunnel: ${tunnel_url}"
    write_status "$tunnel_url" true
    printf '%s\n' "${tunnel_url}/booky/preview-hub.html" > "$ROOT/PREVIEW_URL.txt"

    # Watch tunnel health; restart when it dies
    while true; do
      sleep 15
      if ! curl -sf "${tunnel_url}/booky/preview-status.json" >/dev/null 2>&1; then
        if ! kill -0 "$(cat "$LOG_DIR/tunnel.pid" 2>/dev/null)" 2>/dev/null; then
          echo "[preview-daemon] tunnel died, restarting…"
          break
        fi
        # tunnel process alive but not responding — still restart after 2 failures
        if [[ ! -f "$LOG_DIR/tunnel-fail" ]]; then
          echo 1 > "$LOG_DIR/tunnel-fail"
        else
          echo "[preview-daemon] tunnel unhealthy, restarting…"
          rm -f "$LOG_DIR/tunnel-fail"
          break
        fi
      else
        rm -f "$LOG_DIR/tunnel-fail"
        write_status "$tunnel_url" true
      fi
    done
  else
    echo "[preview-daemon] tunnel failed, retrying in 5s…"
    write_status "" false
    sleep 5
  fi
done

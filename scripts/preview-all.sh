#!/usr/bin/env bash
# Starts HTTP server + public tunnel for Cursor side-browser preview.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"
LOG_DIR="$ROOT/.preview"
mkdir -p "$LOG_DIR"

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
fi
pkill -f "localtunnel --port ${PORT}" 2>/dev/null || true
sleep 0.5

cd "$ROOT"

# Static file server
nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >"$LOG_DIR/http.log" 2>&1 &
HTTP_PID=$!
echo "$HTTP_PID" > "$LOG_DIR/http.pid"

# Wait for HTTP
for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${PORT}/booky/preview.html" >/dev/null; then
    break
  fi
  sleep 0.25
done

# Public tunnel (works in Cursor Simple Browser when localhost does not)
nohup npx --yes localtunnel --port "$PORT" >"$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "$TUNNEL_PID" > "$LOG_DIR/tunnel.pid"

TUNNEL_URL=""
for i in $(seq 1 40); do
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.loca\.lt' "$LOG_DIR/tunnel.log" | head -1 || true)
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  sleep 0.5
done

PREVIEW_PAGE="${TUNNEL_URL}/booky/preview.html"
echo "$PREVIEW_PAGE" > "$ROOT/PREVIEW_URL.txt"
printf '%s\n' "$TUNNEL_URL" > "$ROOT/booky/.tunnel-base"

cat > "$ROOT/booky/preview-url.js" <<EOF
window.BOOKY_PREVIEW_URL = "${PREVIEW_PAGE}";
EOF

echo ""
echo "══════════════════════════════════════════════════"
echo "  BOOKY PREVIEW — paste this in the right browser:"
echo ""
echo "  ${PREVIEW_PAGE}"
echo ""
echo "  Edit: booky/styles.css  →  Save  →  Refresh browser"
echo "══════════════════════════════════════════════════"

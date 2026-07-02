#!/usr/bin/env bash
# Local Booky only — one HTTP server, no tunnel, no public URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"
SESSION="booky-serve"
TMUX_CONF="/exec-daemon/tmux.portal.conf"

# Stop old preview daemon (cloudflare tunnel) if it was started earlier
tmux -f "$TMUX_CONF" kill-session -t booky-preview 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://127.0.0.1:${PORT}" 2>/dev/null || true

if command -v fuser >/dev/null 2>&1; then
  if ! curl -sf "http://127.0.0.1:${PORT}/booky/" >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 0.3
  fi
fi

if ! tmux -f "$TMUX_CONF" has-session -t "=$SESSION" 2>/dev/null; then
  tmux -f "$TMUX_CONF" new-session -d -s "$SESSION" -c "$ROOT" \
    -- python3 -m http.server "$PORT" --bind 0.0.0.0
  sleep 0.5
fi

echo ""
echo "════════════════════════════════════════"
echo "  Booky — local only (port ${PORT})"
echo ""
echo "  Game:       http://localhost:${PORT}/booky/"
echo "  Win screen: http://localhost:${PORT}/booky/?preview=newbie"
echo ""
echo "  Cursor: Ports → ${PORT} → globe icon"
echo "════════════════════════════════════════"
echo ""

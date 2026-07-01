#!/usr/bin/env bash
# Local Booky preview — run from repo root: ./scripts/preview.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
fi

cd "$ROOT"
echo ""
echo "  Booky preview server"
echo "  ─────────────────────────────────────────"
echo "  Promo (Heba):  http://localhost:${PORT}/booky/promo/?book=weavingshaw&format=story"
echo "  Dev split:     http://localhost:${PORT}/booky/dev-preview.html"
echo "  Game:          http://localhost:${PORT}/booky/"
echo "  Win screen:    http://localhost:${PORT}/booky/win-preview.html?s=newbie"
echo ""
echo "  In Cursor: Ports panel → forward ${PORT} → open in browser (right split)"
echo "  Press Ctrl+C to stop"
echo ""

exec python3 -m http.server "$PORT" --bind 0.0.0.0

#!/usr/bin/env bash
# Start preview daemon if not running; print current URLs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"
SESSION="booky-preview"
TMUX_CONF="/exec-daemon/tmux.portal.conf"

if tmux -f "$TMUX_CONF" has-session -t "=$SESSION" 2>/dev/null; then
  # Restart if status is stale (>2 min) or tunnel dead
  if [[ -f "$STATUS" ]]; then
    stale="$(python3 -c "
import json, datetime
d=json.load(open('$STATUS'))
if not d.get('tunnelOk'): raise SystemExit(0)
u=d.get('updated','')
if u=='pending': raise SystemExit(0)
age=(datetime.datetime.now(datetime.UTC)-datetime.datetime.fromisoformat(u.replace('Z','+00:00'))).total_seconds()
raise SystemExit(1 if age>120 else 0)
" 2>/dev/null && echo yes || echo no)"
    if [[ "$stale" == "yes" ]]; then
      tmux -f "$TMUX_CONF" kill-session -t "=$SESSION" 2>/dev/null || true
      sleep 0.5
    fi
  fi
fi

if ! tmux -f "$TMUX_CONF" has-session -t "=$SESSION" 2>/dev/null; then
  tmux -f "$TMUX_CONF" new-session -d -s "$SESSION" -c "$ROOT" -- bash scripts/preview-daemon.sh
  sleep 3
fi

STATUS="$ROOT/booky/preview-status.json"
echo ""
echo "══════════════════════════════════════════════════"
echo "  BOOKY PREVIEW (always use the hub page)"
echo ""
if [[ -f "$STATUS" ]]; then
  python3 - "$STATUS" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print("  Hub (bookmark):", d.get("tunnel", d["local"])["hub"])
print("  Win screen:    ", d.get("tunnel", d["local"])["win"])
print("  Game:          ", d.get("tunnel", d["local"])["game"])
if d.get("tunnel"):
  print("")
  print("  Local (Ports→8080):", d["local"]["hub"])
print("")
print("  Updated:", d.get("updated", "?"))
PY
else
  echo "  Starting… open http://localhost:${PORT}/booky/preview-hub.html"
  echo "  (Cursor: Ports panel → 8080 → globe icon)"
fi
echo "══════════════════════════════════════════════════"
echo ""

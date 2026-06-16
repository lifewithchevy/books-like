#!/usr/bin/env bash
# Runs every Reddit mining query in sequence. Takes ~30-50 min total
# because Reddit's public JSON endpoints rate-limit at ~55 req/min and we
# pause politely between requests.
#
# Each query writes data/<slug>.json which Claude then reads to update
# the corresponding shelf or rec list in index.html.
#
# Resumable: skips any query whose output JSON already exists.

set -euo pipefail
cd "$(dirname "$0")"

run() {
  local query="$1"; shift
  local slug
  slug=$(echo "$query" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/^-*//; s/-*$//')
  local out="data/$slug.json"
  if [[ -f "$out" ]]; then
    echo "↷ skip (already fetched): $slug"
    return
  fi
  echo ""
  echo "════════════════════════════════════════"
  echo "  $query"
  echo "════════════════════════════════════════"
  node fetch.mjs "$query" "$@"
}

# === Reader Favorites (homepage hero shelf) — all-time most recommended ===
run "most recommended books ever"           suggestmeabook books
run "books everyone should read"            suggestmeabook books

# === Books Like X — top 8 homepage entry points ===
run "books like fourth wing"                RomanceBooks Fantasy suggestmeabook Romantasy
run "books like acotar"                     RomanceBooks Fantasy suggestmeabook
run "books like it ends with us"            RomanceBooks suggestmeabook
run "books like seven husbands evelyn hugo" suggestmeabook books
run "books like verity"                     RomanceBooks suggestmeabook
run "books like the song of achilles"       suggestmeabook books
run "books like the midnight library"       suggestmeabook books
run "books like gone girl"                  suggestmeabook books

# === Per-shelf trope/mood queries ===
run "best enemies to lovers"                RomanceBooks suggestmeabook
run "darkest romance books"                 RomanceBooks
run "cozy fantasy"                          Fantasy suggestmeabook cozyreads
run "shortest gripping standalone"          suggestmeabook books
run "book club must read"                   bookclub books suggestmeabook
run "epic fantasy recommendations"          Fantasy suggestmeabook
run "swoon worthy romance"                  RomanceBooks suggestmeabook
run "literary fiction that changed me"      books suggestmeabook literature

echo ""
echo "════════════════════════════════════════"
echo "  ✓ DONE. Data files written to data/"
echo "════════════════════════════════════════"
ls -lh data/

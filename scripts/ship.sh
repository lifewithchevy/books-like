#!/usr/bin/env bash
#
# scripts/ship.sh — the one way to put a change on 90books.com.
#
#   bash scripts/ship.sh
#
# Any session, any file. There is no file-ownership boundary: one agent owns
# this repo, and the thing that actually protects prod is this script, not a
# rule about who may touch what.
#
# It refuses to ship a dirty tree, refuses to ship a queue that fails the
# validators, pushes, then BLOCKS until the live domain proves it has the
# change. "I pushed" has never meant "it shipped" on this project — a push can
# build a deployment that sits unaliased while 90books.com serves the old one.
#
# Exit 0 only when prod is verified healthy and serving what is in the repo.

set -uo pipefail
cd "$(dirname "$0")/.."

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
die()  { red "ABORT: $*"; exit 1; }

say "1/5  Syncing with origin"
git remote update origin >/dev/null 2>&1
if [ -n "$(git status --porcelain)" ]; then
  git status --short
  die "uncommitted changes. Commit them first — a deploy builds the git tree, so anything uncommitted is silently left out."
fi
git pull --ff-only || die "pull failed. Rebase or merge by hand, then re-run."

say "2/5  Validating the word queue"
python3 scripts/validate_queue_lock.py || die "today's or a past word changed. Never edit a day that has already gone live."
python3 scripts/validate_winnable.py  || die "a scheduled answer is missing from dictionary.json — that day would be unwinnable."
python3 scripts/validate_giveaway.py  || die "giveaway array is invalid."
python3 scripts/validate_daily_words_sync.py || die "booky/daily-words.json drifted from words.json — run: cp booky/words.json booky/daily-words.json"
node scripts/validate_hints.mjs || die "a scheduled word cannot serve a hint. Fix the queue or the book mapping before shipping."

say "3/5  Loading every API route"
for f in api/*.js; do
  case "$f" in api/_*) continue;; esac
  node -e "require('./$f')" 2>/dev/null || die "$f does not load — it would 500 in production."
done
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))" || die "vercel.json is not valid JSON."
grn "     routes ok, vercel.json ok"

say "4/5  Pushing to main"
if [ -z "$(git log origin/main..HEAD --oneline)" ]; then
  echo "     nothing new to push — verifying prod matches anyway"
else
  git log origin/main..HEAD --oneline | sed 's/^/     /'
  git push origin main || die "push rejected. If it names .github/workflows, the saved GitHub token lacks 'workflow' scope — see CLAUDE.md."
fi

say "5/5  Waiting for prod to serve it"
for i in $(seq 1 20); do
  out="$(node scripts/health-live.mjs 2>&1)"
  if printf '%s' "$out" | grep -q '^healthy'; then
    printf '%s\n' "$out"
    grn "SHIPPED — https://90books.com is serving this commit and is healthy."
    exit 0
  fi
  printf '     attempt %s/20 — not live yet\n' "$i"
  sleep 20
done

printf '%s\n' "$out"
red "PUSHED BUT NOT VERIFIED after ~7 minutes."
cat <<'EOS'

The commit is on main but prod has not caught up. Most likely the
force-booky-prod workflow did not fire, so the deployment built and sat
without the 90books.com alias. Dispatch it by hand:

  TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p')
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    https://api.github.com/repos/lifewithchevy/books-like/actions/workflows/force-booky-prod.yml/dispatches \
    -d '{"ref":"main"}'      # 204 = accepted, ~90s to run

Then re-run: node scripts/health-live.mjs
EOS
exit 1

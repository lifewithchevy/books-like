#!/usr/bin/env python3
"""Fail if any scheduled Booky answer is missing from dictionary.json.

Those days are unwinnable: app.js rejects guesses not in DICT, and the answer
is never auto-added. Run before shipping queue or dictionary changes:

  python3 scripts/validate_winnable.py

SCOPE: this checks the LOCAL booky/words.json only. Production serves the queue
from /api/booky-words, which proxies booky-deploy.vercel.app, so passing here
does NOT prove the live game is safe. For that run:

  node scripts/health-live.mjs

which is also on a daily schedule (.github/workflows/booky-health.yml).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DICT_PATH = ROOT / "booky" / "dictionary.json"
WORDS_PATH = ROOT / "booky" / "words.json"


def main() -> int:
    dct = {w.upper() for w in json.loads(DICT_PATH.read_text())}
    queue = json.loads(WORDS_PATH.read_text())["queue"]
    bad = sorted({w.upper() for w in queue if w.upper() not in dct})
    if bad:
        print("Unwinnable answers (in queue, missing from dictionary.json):")
        for w in bad:
            print(f"  {w}")
        print(f"\n{len(bad)} word(s) — add them to booky/dictionary.json before shipping.")
        return 1
    print(f"Unwinnable answers remaining: NONE ✓  ({len(queue)} queue words, {len(dct)} dict)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

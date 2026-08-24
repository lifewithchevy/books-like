#!/usr/bin/env python3
"""booky/daily-words.json must be a byte-for-byte copy of booky/words.json.

It is the alternate path the edge middleware and the library shelf read
(`index.html` -> bklLoadWordData, middleware.js -> getLibraryBooks). It exists
only to dodge a stuck CDN object on /booky/words.json, so it is the SAME
payload, never a second queue.

It drifted anyway: on 2026-08-24 it still held a 245-word queue from a restore
commit while words.json was at 274, so every word after that restore was wrong
in the file. Prod was unaffected because the middleware rewrites the path to
/api/booky-words, but the moment that rewrite does not run (the comments in
middleware.js note the edge sometimes serves the frozen static object) players
get the stale queue. Copy, never hand-edit:

    cp booky/words.json booky/daily-words.json
"""
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
words = root / "booky" / "words.json"
daily = root / "booky" / "daily-words.json"

a = words.read_bytes()
b = daily.read_bytes()
if a == b:
    print(f"OK: daily-words.json matches words.json ({len(a)} bytes)")
    sys.exit(0)

print("daily-words.json has drifted from words.json.")
print("  Fix with: cp booky/words.json booky/daily-words.json")
sys.exit(1)

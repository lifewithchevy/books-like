#!/usr/bin/env python3
"""Rebuild booky/dictionary.json — the list of guesses the game ACCEPTS.

Why this exists
---------------
The original dictionary was macOS `/usr/share/dict/words` (Webster's 1934)
filtered to 5 letters. That list has two problems for a word game:

  * it is missing most inflected forms — GAMES, TALKS, TEARS, PROUD and WOMEN
    were all rejected, while BOOKS, WALKS and COMES were accepted. Only 6.7% of
    it ended in S (a real guess list is ~25-30%). Players could not predict what
    would be taken, which is what produced the constant "not on list" banner.
  * it carries archaic entries (ABAFF, ABAZE) nobody guesses.

So we union it with the NYT Wordle valid-guess list, the de-facto standard for
what a 5-letter word game accepts, and add the romantasy character names the
queue uses.

This only ever GROWS the list. Nothing that was accepted before stops being
accepted, so no scheduled answer can become unwinnable.

Usage:
  python3 scripts/build_dictionary.py            # rebuild in place
  python3 scripts/build_dictionary.py --check     # report, write nothing

After running, bump the `dictionary.json?v=` cache-buster in booky/app.js —
it is fetched with `cache: 'force-cache'`, so returning players keep the old
copy until that number changes.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DICT_PATH = ROOT / "booky" / "dictionary.json"
WORDS_PATH = ROOT / "booky" / "words.json"

# NYT's current valid-guess list (slurs already removed by the NYT).
WORDLE_URL = (
    "https://gist.githubusercontent.com/dracos/dd0668f281e685bad51479e5acaadb93"
    "/raw/valid-wordle-words.txt"
)

# Romantasy character/place names that appear in (or are mapped for) the queue.
# Standard word lists have no proper nouns, but this is a romantasy game — the
# fandom guesses these, and a queue answer missing here is an unwinnable day.
FANDOM = """
ACRUX AELIN AIDIA AMREN ASHER AUREN BJORN CHAOL CLODE DARCY FEYRE FREYA GRIMM
HAWKE HELEN IGNIS IRIDS ITHAN JACKS KADEN KAINE KOLIS LIDIA LOCKE MADOC MALEC
MALIK MERYN MIDAS ORAYA RAEVE RAIHN RAVYN REEVE RIDOC RIGEL SOLIS SYBIL TAIRN
TARYN TELLA TERRA TURAH VEGAS WOLFE XADEN YRENE NESTA ELAIN POPPY CASEY LANCE
CALEB MOURN CROWS
""".split()


# The NYT list still contains slurs. Removed here so the game never quietly
# accepts one. The line is: slurs against a protected group (race, ethnicity,
# sexuality, disability) and sexual-violence terms come out. Ordinary profanity
# stays — it is normal English, several entries (BITCH, WHORE, PUSSY, PRICK)
# were already accepted before this rebuild, and romantasy is a spicy genre.
# Words with a mainstream innocent sense are kept (CHINK as in armour, QUEER,
# GYPSY as in gypsy moth).
BLOCKLIST = """
NIGGA KIKES GOOKS SPICS DAGOS COONS SAMBO BOONG INJUN SQUAW GYPPO NEGRO
FAGGY FAGOT DYKES DYKEY HOMOS
SPAZZ TARDS MONGO CRIPS
RAPED RAPES RAPER
""".split()


def five_letter(words) -> set[str]:
    return {w.strip().upper() for w in words if len(w.strip()) == 5 and w.strip().isalpha()}


def main() -> int:
    check_only = "--check" in sys.argv

    current = five_letter(json.loads(DICT_PATH.read_text()))
    with urllib.request.urlopen(WORDLE_URL, timeout=60) as r:
        wordle = five_letter(r.read().decode().splitlines())

    blocked = five_letter(BLOCKLIST)
    merged = (current | wordle | five_letter(FANDOM)) - blocked

    # Invariants. Additive apart from the blocklist, and never unwinnable.
    dropped = (current - merged) - blocked
    assert not dropped, f"regression — dropped {len(dropped)} existing words: {sorted(dropped)}"
    queue = {w.upper() for w in json.loads(WORDS_PATH.read_text())["queue"]}
    unwinnable = sorted(queue - merged)
    assert not unwinnable, f"unwinnable answers: {unwinnable}"

    out = sorted(merged)
    print(f"current {len(current)} + wordle {len(wordle)} -> {len(out)} (+{len(out) - len(current)})")
    print(f"blocked {len(blocked & (current | wordle))} slur/violence terms "
          f"({len(blocked & current)} of them were previously live)")

    if check_only:
        print("--check: nothing written")
        return 0

    # Match the existing on-disk shape: one line, `["AALII", "AARON", ...]`.
    DICT_PATH.write_text(json.dumps(out))
    print(f"wrote {DICT_PATH.relative_to(ROOT)}")
    print("NEXT: bump the dictionary.json?v= number in booky/app.js")
    return 0


if __name__ == "__main__":
    sys.exit(main())

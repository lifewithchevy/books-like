#!/usr/bin/env python3
"""Guard the giveaway schedule in booky/words.json.

Why this exists: on 2026-07-29 a FUTURE giveaway was written into the single
`giveaway` slot while giveaway #1 was still running. The live card vanished
mid-window, days after the window had been promised to readers on Reddit and
by email. `giveaway` is now an ARRAY and future ones must be APPENDED.

Run before shipping any change to booky/words.json:
    python3 scripts/validate_giveaway.py
"""
import json
import os
import sys
from datetime import date

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS = os.path.join(REPO, "booky", "words.json")


def main() -> int:
    with open(WORDS, encoding="utf-8") as fh:
        data = json.load(fh)

    raw = data.get("giveaway")
    if raw is None:
        print("No giveaway configured — nothing to check. OK")
        return 0

    if not isinstance(raw, list):
        print(
            "FAIL: `giveaway` must be an ARRAY.\n"
            "  A bare object is a single slot, so scheduling the next giveaway\n"
            "  overwrites one that may still be running. Wrap it in [ ] and\n"
            "  append future giveaways instead."
        )
        return 1

    today = date.today()
    errors, active = [], []
    required = ("start", "end", "announce", "tag", "title")

    for i, g in enumerate(raw):
        where = f"giveaway[{i}]"
        missing = [k for k in required if not g.get(k)]
        if missing:
            errors.append(f"{where}: missing {', '.join(missing)}")
            continue
        try:
            start = date.fromisoformat(g["start"])
            end = date.fromisoformat(g["end"])
        except ValueError as exc:
            errors.append(f"{where} ({g['tag']}): bad date — {exc}")
            continue
        if end < start:
            errors.append(f"{where} ({g['tag']}): end {end} is before start {start}")
        if start <= today <= end:
            active.append(g)

    # Overlapping windows would make which card shows order-dependent.
    dated = []
    for g in raw:
        try:
            dated.append((date.fromisoformat(g["start"]), date.fromisoformat(g["end"]), g.get("tag")))
        except (ValueError, KeyError, TypeError):
            pass
    dated.sort()
    for (s1, e1, t1), (s2, e2, t2) in zip(dated, dated[1:]):
        if s2 <= e1:
            errors.append(f"overlapping windows: {t1} ({s1}..{e1}) and {t2} ({s2}..{e2})")

    tags = [g.get("tag") for g in raw if g.get("tag")]
    if len(tags) != len(set(tags)):
        errors.append("duplicate `tag` values — each giveaway needs a unique entry tag")

    if errors:
        print("Giveaway schedule INVALID:")
        for e in errors:
            print("  -", e)
        return 1

    print(f"Giveaway schedule OK ({len(raw)} configured).")
    for g in raw:
        mark = "  <-- LIVE NOW" if g in active else ""
        print(f"  {g['tag']:20s} {g['start']} -> {g['end']}{mark}")
    if not active:
        print("  (none live today — that is fine if no giveaway is meant to be running)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

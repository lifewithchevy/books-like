#!/usr/bin/env python3
"""Guard: every calendar week in the Booky queue must contain at least one word
that maps to From Blood and Ash (Jennifer L. Armentrout).

Weeks are ISO weeks (Mon-Sun); the queue epoch is a Monday so day 1 begins a
week cleanly. Exits non-zero and lists the offending weeks if any week has no
From Blood and Ash word, so it can be wired into CI or a pre-push check.

Usage: python3 scripts/validate_fbaa_weekly.py
"""
import json
import sys
from datetime import date, timedelta

PATH = 'booky/words.json'
FBAA_SLUG = 'from-blood-and-ash'

data = json.load(open(PATH))
wb = data['wordBooks']
q = data['queue']
y, m, d = map(int, data['epoch'].split('-'))
epoch = date(y, m, d)
book = lambda w: wb.get(w, {}).get('slug', '')

weeks = {}
for i, w in enumerate(q):
    dt = epoch + timedelta(days=i)
    weeks.setdefault(dt.isocalendar()[:2], []).append((dt, i + 1, w))

bad = []
for key in sorted(weeks):
    days = weeks[key]
    if not any(book(w) == FBAA_SLUG for _, _, w in days):
        bad.append((key, days[0][0], days[-1][0]))

if bad:
    print(f"FAIL: {len(bad)} week(s) without a From Blood and Ash word:")
    for (yr, wk), start, end in bad:
        print(f"  ISO {yr}-W{wk:02d}  {start} -> {end}")
    sys.exit(1)

print(f"OK: all {len(weeks)} weeks contain a From Blood and Ash word "
      f"({len(q)} days, epoch {epoch}).")

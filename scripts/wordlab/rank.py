#!/usr/bin/env python3
"""
Take the raw scored rows from the browser harvest and turn them into a
yes/no shortlist: drop anything unusable, flag anything that needs work.

The browser does the harvesting and the specificity maths (see HARVEST.md).
This does the part that needs the repo: dictionary, queue history, spacing.

    python3 scripts/wordlab/rank.py /tmp/acotar_rows.json \
        --title "A Court of Thorns and Roses" --slug a-court-of-thorns-and-roses
"""
import argparse, json, datetime, sys, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("rows")
    p.add_argument("--title", required=True)
    p.add_argument("--slug", default="")
    p.add_argument("--top", type=int, default=20)
    a = p.parse_args()

    payload = json.loads(Path(a.rows).read_text())
    data = json.loads((ROOT / "booky" / "words.json").read_text())
    dictionary = set(json.loads((ROOT / "booky" / "dictionary.json").read_text()))
    ep = datetime.date.fromisoformat(data["epoch"])
    today = datetime.date.today()
    q, wb = data["queue"], data["wordBooks"]

    played, future = {}, {}
    for i, w in enumerate(q):
        d = ep + datetime.timedelta(days=i)
        (played if d <= today else future).setdefault(w, d)

    print(f"{payload['book']}: {payload['bookPosts']} posts vs {payload['basePosts']} baseline posts")
    print(f"\n{'WORD':7}{'HITS':6}{'SPEC':8}{'DICT':6}{'STATUS':22}NOTE")
    shown = 0
    for word, hits, spec in payload["rows"]:
        if shown >= a.top:
            break
        note = ""
        # a word the fandom says but no dictionary has is usually a typo,
        # a username or a sub abbreviation (ACOSH, FEYRA, HOFAS)
        in_dict = word in dictionary
        if word in played:
            continue
        mapped = wb.get(word, {}).get("title", "")
        if mapped and mapped != a.title:
            note = f"already {mapped}"
        status = f"sched {future[word]}" if word in future else "FREE"
        if not in_dict:
            note = (note + "; " if note else "") + "needs dict add"
        print(f"{word:7}{hits:<6}{spec:<8}{'Y' if in_dict else 'N':6}{status:22}{note}")
        shown += 1

    print("\nwallpaper check — what is already scheduled for this book:")
    rank = {w: s for w, _, s in payload["rows"]}
    # ⚠️ A word missing from `rows` was below the harvest cutoff, which is NOT
    # the same as zero. Say so, rather than printing 0.0 and implying the
    # fandom never says it. BOWEL is the cautionary case: it is r/acotar's
    # biggest in-joke and still misses a top/hot sample, because the joke
    # lives in a handful of dedicated threads rather than spread across the sub.
    sched = [(w, d) for w, d in future.items() if wb.get(w, {}).get("title") == a.title]
    for w, d in sorted(sched, key=lambda x: -rank.get(x[0], -1)):
        if w not in rank:
            print(f"  {w:7}{'—':<8}{d}   below sample, score it directly")
            continue
        s = rank[w]
        verdict = "strong" if s >= 20 else ("ok" if s >= 5 else "WALLPAPER")
        print(f"  {w:7}{s:<8}{d}   {verdict}")

if __name__ == "__main__":
    main()

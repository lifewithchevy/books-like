#!/usr/bin/env python3
"""
Score candidate Booky words by how much they BELONG to one book.

The queue kept filling with romantasy wallpaper: GLADE, MASKS, SPELL, SHINE.
Those words are common in the genre, so a reader who sees them on the reveal
card learns nothing and feels nothing. The words that work (ROSES for r/acotar,
BOWEL, ITHAN) are the ones a fandom says constantly and the rest of the genre
never says at all.

So the score is a RATIO, not a count:

    specificity = rate in this book's fandom / rate in the genre at large

A word said 60 times in r/crescentcitysjm and 60 times everywhere else is
wallpaper. A word said 60 times there and twice elsewhere is that book's word.

Usage:
    python3 scripts/wordlab/score_words.py --book corpus/crescentcity.txt \
        --baseline corpus/romantasy-baseline.txt --title "House of Earth and Blood"

Corpora are plain text dumps produced by scripts/wordlab/HARVEST.md.
"""
import argparse, json, math, re, sys, datetime, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Words that are frequent in ANY English text and carry no book identity.
# Deliberately short: the baseline corpus does the real work of catching
# genre-generic words. This only removes conversational noise.
STOP = set("""about above after again their there these those which while would could every first
found other place where world story write wrote reads reader really thank thanks great loved liked
being never always still since maybe might much many most some what when have will your this that
from they been more than then them were here also just like love read good best know want need make
made take does said tell give come went look feel felt very only even such into over back down
start point going doing years happy quite least whole thats gonna kinda pretty sorry stuff yeah okay
books book chapter series spoiler thread comment reply reddit https width image imgur giphy order
looks makes times later today sense agree seems tried super cause asked means think thing right
shall learn least alone along among below could night black white green small large house court
""".split())


def tokens(text):
    return [w.lower() for w in re.findall(r"\b[A-Za-z]{5}\b", text)]


def rates(text):
    """word -> occurrences per million tokens."""
    toks = tokens(text)
    n = len(toks) or 1
    c = collections.Counter(t for t in toks if t not in STOP)
    return {w: (k * 1_000_000 / n) for w, k in c.items()}, c, n


def load_queue():
    data = json.loads((ROOT / "booky" / "words.json").read_text())
    ep = datetime.date.fromisoformat(data["epoch"])
    today = datetime.date.today()
    played, future = set(), {}
    for i, w in enumerate(data["queue"]):
        d = ep + datetime.timedelta(days=i)
        (played.add(w) if d <= today else future.setdefault(w, d))
    return data, played, future


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--book", required=True, help="text dump of the book's own fandom")
    p.add_argument("--baseline", required=True, help="text dump of general romantasy talk")
    p.add_argument("--title", default="", help="book title, to flag words already mapped elsewhere")
    p.add_argument("--min-hits", type=int, default=8, help="ignore words the fandom barely says")
    p.add_argument("--top", type=int, default=30)
    args = p.parse_args()

    book_rate, book_count, book_n = rates(Path(args.book).read_text(errors="ignore"))
    base_rate, _, base_n = rates(Path(args.baseline).read_text(errors="ignore"))
    data, played, future = load_queue()
    wb = data["wordBooks"]
    dictionary = set(json.loads((ROOT / "booky" / "dictionary.json").read_text()))

    rows = []
    for w, br in book_rate.items():
        hits = book_count[w]
        if hits < args.min_hits:
            continue
        W = w.upper()
        # +1 smoothing on the baseline rate so a word absent from the genre
        # corpus scores high but not infinitely high.
        floor = 1_000_000 / base_n
        spec = br / max(base_rate.get(w, 0.0), floor)
        rows.append({
            "word": W,
            "hits": hits,
            "specificity": round(spec, 1),
            "in_dict": W in dictionary,
            "played": W in played,
            "future": str(future.get(W, "")),
            "mapped_to": wb.get(W, {}).get("title", ""),
        })

    rows.sort(key=lambda r: (-r["specificity"], -r["hits"]))

    usable = [r for r in rows if not r["played"]]
    print(f"corpus: {book_n:,} tokens vs baseline {base_n:,} tokens\n")
    print(f"{'WORD':7}{'HITS':6}{'SPECIFICITY':13}{'DICT':6}{'STATUS':14}MAPPED TO")
    for r in usable[: args.top]:
        status = "FREE" if not r["future"] else f"sched {r['future']}"
        mapped = r["mapped_to"]
        if mapped and args.title and mapped != args.title:
            mapped = f"⚠ {mapped}"
        print(f"{r['word']:7}{r['hits']:<6}{r['specificity']:<13}"
              f"{'Y' if r['in_dict'] else 'ADD':6}{status:14}{mapped}")

    burned = [r for r in rows[: args.top * 2] if r["played"]]
    if burned:
        print("\nalready played (for reference):")
        print("  " + ", ".join(f"{r['word']}({r['specificity']})" for r in burned[:12]))


if __name__ == "__main__":
    main()

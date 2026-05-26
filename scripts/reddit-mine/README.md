# Reddit Mining — 90books

Free, public, no-auth pipeline for measuring how often books are recommended
in Reddit threads. Used to back the curated shelves on the homepage with
honest data instead of editorial guesses.

## How it works

Two phases:

1. **`fetch.mjs`** (dumb fetcher) — hits Reddit's public JSON endpoints
   (`/r/SUB/search.json`, `/comments/ID.json`) and writes raw thread bodies
   + flattened comment trees to `data/<query-slug>.json`. No API key. No
   paid tier. Rate-limited to ~55 req/min so Reddit doesn't push back.

2. **Claude extracts mentions** (this conversation) — reads the JSON output,
   parses comment text for book titles, tallies mentions across threads,
   and updates the curated lists in `index.html`. Claude is the "extractor"
   because robust book-title extraction needs language understanding;
   regex would miss things like "I always rec ACOTAR" or "Maas's first
   series".

## Honest disclosure

This is **best-effort**, not authoritative:

- Reddit's public JSON endpoints are unofficial; could change/break.
- We sample top ~10 threads per query per sub. Different sampling →
  slightly different counts. Real signal still beats no signal.
- Extraction by language model isn't 100% — books get missed or
  misattributed. We use it as a directional sanity check, not the
  final word.

## Running it

```bash
cd scripts/reddit-mine

# Fetch one query across the romance subs:
node fetch.mjs "books like fourth wing" RomanceBooks Fantasy suggestmeabook Romantasy

# Then ask Claude (in the 90books chat) to read data/books-like-fourth-wing.json
# and update the curated rec list for Fourth Wing accordingly.
```

Typical query takes ~3-5 minutes. Output JSON is ~500KB-2MB per query.

## Recommended queries to run

To validate the homepage shelves with real Reddit data:

| Query | Subs | Validates |
|---|---|---|
| `"books like fourth wing"` | RomanceBooks Fantasy suggestmeabook Romantasy | Books Like → Fourth Wing rec list |
| `"books like acotar"` | RomanceBooks Fantasy suggestmeabook | Books Like → ACOTAR rec list |
| `"best enemies to lovers"` | RomanceBooks suggestmeabook | Enemies to Lovers shelf |
| `"darkest romance"` | RomanceBooks | Dark & Unputdownable shelf |
| `"cozy fantasy"` | Fantasy suggestmeabook | Cozy & Comforting shelf |
| `"shortest gripping read"` | suggestmeabook books | Quick Reads shelf |
| `"book club must read"` | bookclub books suggestmeabook | Book Club Favorites shelf |

Run them one at a time. After each, Claude will read the output and update
the corresponding shelf in `index.html`.

## Why not Pushshift / Reddit API?

- **Pushshift**: restricted to subreddit mods since 2023.
- **Reddit official API**: free tier exists but requires OAuth registration
  + 100/min limit + tightened terms-of-service for commercial use. The
  public JSON endpoints we use here are the same data without registration,
  but politely (lower rate, identifying User-Agent).
- **Paid scrapers** (Apify, Bright Data, etc.): cost $20+/month for the
  volume we'd need. Not worth it at this stage.

This setup gets ~80% of what a paid pipeline would produce, at $0/month,
with code we own.

## Data hygiene

- `data/*.json` is git-ignored — these are raw fetches, regenerate locally
- Don't commit the data files (they're large + Reddit content has its own
  copyright)
- Re-run quarterly or when a major adaptation/release shifts demand

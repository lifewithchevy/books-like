# CLAUDE.md

Guidance for Claude when working in this repository.

## Booky daily word game (`booky/`)

`booky/words.json` drives the daily word game. Structure:

- `epoch` — the date (a Monday) that maps to day 1 of the queue.
- `queue` — ordered list of 5-letter words; the word for a given date is
  `queue[dayNumber - 1]`, where `dayNumber` is days-since-epoch + 1 (see
  `booky/app.js` → `computeDayNumber`).
- `wordBooks` — maps each word to the book shown on the end screen
  (`slug`, `title`, `author`, `cover`).

### Standing rules for the word queue

- **From Blood and Ash every week:** every calendar week (ISO Mon–Sun) must
  contain at least one word mapped to *From Blood and Ash* (Jennifer L.
  Armentrout, slug `from-blood-and-ash`). Enforce with
  `python3 scripts/validate_fbaa_weekly.py` before shipping queue changes.
- **Monthly author outreach:** when planning or revising a month's words,
  cross-reference upcoming book **release dates** and propose that month's
  featured titles/authors so the team can reach out to authors around their
  launch. Surface these suggestions per month.
- Avoid two consecutive days mapping to the same book where possible (existing
  quality guard; see `scripts/reshuffle_after_jun7.py`).

## Deployment

The site is a Vercel project (90books.com) wired to Git — **production deploys
are triggered when changes land on `main`** (there is no Vercel CLI or token in
the web/agent environment). Deploy by merging to `main`. Vercel posts
deployment status back to the merge commit on GitHub; the live site itself may
not be reachable from restricted network environments.

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

The site is a Vercel project (`90books.com`, project `book-recs-app`) wired to
Git. Merging to `main` triggers a Vercel production deploy — **but that alone
is not enough for the custom domain**.

`90books.com` can stay pinned to an older deployment even when GitHub shows a
successful Vercel status on the merge commit. The durable fix is the GitHub
Actions workflow `.github/workflows/force-booky-prod.yml` (**Force production
alias**): on **every** push to `main` it runs `vercel deploy --prod` and
re-aliases `90books.com`, `www.90books.com`, and `book-recs-app.vercel.app` to
that deploy, then smoke-checks `/`, `/booky`, and `/api/booky-words`.

Deploy by merging to `main`. Do not rely on the Git-integration deploy URL alone
as proof the live domain updated — wait for the force-alias workflow (or check
https://90books.com/ directly). There is no Vercel CLI/token in the web/agent
environment by default; the workflow uses `secrets.VERCEL_TOKEN`.

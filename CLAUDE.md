# CLAUDE.md

Guidance for Claude when working in this repository.

## Ownership: there is none to negotiate

**Every session may edit every file and ship to production.** No file belongs to
another chat, another session, or Cursor. If you find a problem, fix it — including
in `middleware.js`, `vercel.json`, `index.html` and the API routes.

There used to be a two-chat boundary ("90books owns the site files, the other chat
owns `booky/`"). It was retired on 2026-08-08. It existed to stop two agents
clobbering each other's *uncommitted* work, but what it actually did was leave real
problems unfixed because they sat on the wrong side of a line. The clobbering it
guarded against is prevented properly now: `scripts/ship.sh` refuses to deploy a
dirty tree and pulls before it pushes, so nothing uncommitted is ever in flight.

### Shipping

```bash
bash scripts/ship.sh
```

Commit first, then run it. It syncs with origin, runs the three queue validators,
loads every API route, pushes, and then **blocks until 90books.com actually serves
the change**. It exits non-zero if prod does not catch up, with the manual
alias-dispatch command. Do not treat a push as a deploy — a push can build a
deployment that sits unaliased while the live domain serves the old one.

The only thing a session cannot push is `.github/workflows/*`: the saved GitHub
credential is an OAuth App token without `workflow` scope. Everything else works.
Edit workflow files through github.com, or ask Olga to grant the scope.

## Booky daily word game (`booky/`)

`booky/words.json` drives the daily word game. Structure:

- `epoch` — the date (a Monday) that maps to day 1 of the queue.
- `queue` — ordered list of 5-letter words; the word for a given date is
  `queue[dayNumber - 1]`, where `dayNumber` is days-since-epoch + 1 (see
  `booky/app.js` → `computeDayNumber`).
- `wordBooks` — maps each word to the book shown on the end screen
  (`slug`, `title`, `author`, `cover`).
- `giveaway` — **an ARRAY** of giveaway cards shown on the win screen. See
  "Giveaways" below before touching it.

### ⚠️ Before you ship ANY change to `booky/words.json`

Run all three. They take a second and each one exists because something broke:

```bash
python3 scripts/validate_queue_lock.py   # today/past slots unchanged
python3 scripts/validate_winnable.py     # every answer is in dictionary.json
python3 scripts/validate_giveaway.py     # giveaway array valid, shows what's live
```

**Where the live data comes from (changed 2026-08-08).** `/api/booky-words` now
serves **this repo's `booky/words.json` directly**. Editing the `queue` here does
reach production.

It used to proxy `booky-deploy.vercel.app` and overlay only `giveaway` and
`wordBooks[].cover`, which meant queue edits here silently shipped nothing.
`PROXY_UPSTREAM` in `api/booky-words.js` restores that if it is ever needed.

- To check what players actually get:
  `curl -s -D- -o /dev/null https://90books.com/api/booky-words | grep -i x-booky-words`
- `x-booky-words: local` is the healthy value now. `proxy-booky-deploy` means the
  flip got reverted; `local-fallback:<reason>` only appears if the proxy is back
  on *and* upstream is down.

### Standing rules for the word queue

- **Never change today or past slots:** the queue word for **today**
  (local midnight, same rollover as `computeDayNumber` in `booky/app.js`) and
  every **past** date must never be modified when editing the queue. Only
  **future** dates may change. Displaced words must go to the queue tail or other
  future slots — never into today or past. Enforce with
  `python3 scripts/validate_queue_lock.py` before shipping queue changes.
- **Saturdays are the fandom-post slot:** r/frombloodandash posts used to run
  every Saturday off a guaranteed weekly *From Blood and Ash* word. That rule was
  **retired 2026-07-29** — the FBAA words were pulled from the queue until there
  are fresh ones worth scheduling, and `scripts/validate_fbaa_weekly.py` was
  deleted with it (recover both from git history if FBAA comes back). Saturday is
  still the natural slot for whichever fandom word is being promoted that week.
- **Zodiac Academy on Thursdays:** words mapped to *Zodiac Academy* (Caroline
  Peckham & Susanne Valenti, slug `zodiac-academy`) should land on **Thursday**
  for the weekly r/ZodiacAcademy post cadence. When moving other words, do not
  leave a ZA answer on a non-Thursday — swap it onto the nearest Thursday
  instead.
- **Monthly author outreach:** when planning or revising a month's words,
  cross-reference upcoming book **release dates** and propose that month's
  featured titles/authors so the team can reach out to authors around their
  launch. Surface these suggestions per month.
- **Release timing:** schedule words tied to an upcoming release at least
  **2 weeks before** release day (e.g. series promo words ahead of a finale).
- Avoid two consecutive days mapping to the same book where possible (existing
  quality guard; see `scripts/reshuffle_after_jun7.py`).
- **Never drop a displaced word:** when scheduling a new word onto a date that
  already has one, keep the queue length and word set intact — move the old word
  to a future date (typically append to the end of `queue`), do not delete it.

### Giveaways (`giveaway` in words.json)

`giveaway` is an **ARRAY**. `booky/app.js` → `activeGiveaway()` shows whichever
entry's `start..end` window (inclusive, local midnight) covers today, and shows
nothing outside every window. It is purely date-driven — there is no on/off flag,
and there must never be one, because anything a human has to switch off gets left
on or switched off early.

- **APPEND a new giveaway. NEVER replace an entry that is still running.**
  On 2026-07-29 a future giveaway was written over the live one while it was
  mid-window; the card vanished from the win screen five days before the end date
  that had been promised to readers on Reddit and by email. That is what the array
  and `scripts/validate_giveaway.py` exist to prevent.
- **Past entries can stay forever.** Out-of-range means it simply doesn't render,
  so there is no cleanup step and nothing to remember.
- Each entry needs `start`, `end`, `announce`, `tag`, `title` (plus `author`,
  `cover`). Windows must not overlap and every `tag` must be unique — the
  validator enforces both.
- **`tag` is the entry key and is load-bearing.** `api/booky-subscribe.js` writes
  it to the Resend contact's `last_name`, which is the only record of who entered
  and the only way to draw a winner. Never reuse or rename a `tag` after a
  giveaway has started, or you merge two giveaways' entrants.
- While a giveaway is live the streak-reminder form is hidden, so the giveaway is
  the single email ask on the win screen. It returns by itself when the window
  ends.
- **Every queue answer must be in the dictionary:** scheduled words missing from
  `booky/dictionary.json` are unwinnable (`app.js` rejects guesses not in DICT).
  Enforce with `python3 scripts/validate_winnable.py` before shipping queue or
  dictionary changes.

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

### ⚠️ The daily-email cron does NOT follow production

`vercel.json` → `crons` runs `/api/booky-send` daily, but Vercel pins the cron to
**one specific deployment** and does not move it when a new production deployment
is created. On 2026-08-13 the cron was still pinned to a deployment from
**2026-07-15** — every daily reminder for a month was built by month-old code,
while `90books.com` served current code the whole time.

That is the real cause of the "note silently did not send" mystery documented at
the top of `api/booky-send.js`: the Aug 7 note *was* deployed, the cron just never
ran that deployment.

- **Check which deployment the cron is pinned to** (Vercel dashboard, logged in,
  from the browser console on vercel.com):
  `(await (await fetch('/api/v9/projects/book-recs-app',{credentials:'include'})).json()).crons`
  — look at `deploymentId` and `updatedAt`. If `updatedAt` is old, the cron is stale.
- **Re-point it** by changing the `crons` block in `vercel.json` (e.g. bump the
  schedule minute) and shipping. A plain redeploy does NOT re-register it.
- **Anything that changes the email is not live until the cron re-registers.**
  `curl 'https://90books.com/api/booky-send?preview=1'` proves what the *domain*
  serves, which is not what subscribers get.

### Standing rule: always verify production

**After any change lands on `main` (merge or direct push), always confirm the
change is live on https://90books.com before treating the task as done.**

Required checklist every time:

1. Wait for **Force production alias** (`.github/workflows/force-booky-prod.yml`)
   to finish successfully on the merge commit — or trigger it via
   `workflow_dispatch` if it did not run.
2. Fetch the **live** URLs that the change affects (not only the Vercel preview /
   Git deploy URL). At minimum hit `https://90books.com/` for landing changes;
   use `/booky`, `/api/booky-words`, `/authors`, etc. when those paths changed.
3. Assert a **change-specific string or behavior** from the merge (copy,
   heading, word-of-the-day, route header, etc.) is present on the live
   response. Green Vercel status on the commit is **not** sufficient proof.
4. If prod still shows the old content: re-run the force-alias workflow, then
   re-check live. Do not close out until prod matches `main`.

Report the live check result to the user (what URL, what marker, pass/fail).

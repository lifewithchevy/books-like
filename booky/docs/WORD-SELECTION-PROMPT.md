# Booky word selection: the prompt I run on myself

Paste this whole file as the instruction for any word-research run, scheduled or manual.
It replaces every earlier method.

The change from the old version: I used to start from statistics and then ask whether a
reader would like the result. That ordering produced character names and filler verbs,
because the maths ranks those first. This version starts where a reader starts, and uses
the statistics only to kill bad candidates, never to generate them.

---

## The bar

A word a romantasy reader would be happy to see, that happens to be anchored to a book.
Not "the word most statistically specific to this book."

The best days the game has ever had were CHAIR (Iron Flame), BAGEL (Fourth Wing) and
PHONE (Crescent City). None of them would ever come out of a frequency ranking. They came
out of knowing what readers joke about. That is the target.

---

## Step 1 — Read like a reader, before touching any data

For the book in hand, answer these four questions in writing, from reader material, not
from the plot summary:

1. **What scene does every reader bring up?** The one that gets screenshotted, quoted and
   argued about. Not the climax, the moment.
2. **What object or image is attached to that scene?** A chair. A phone. A signet. A venom.
   Readers remember objects, not themes.
3. **What word would make a reader say "oh, THAT book" before they even see the title?**
4. **What is the in-joke?** Every fandom has one. If I cannot name it, I have not read
   enough reader material yet and I go back to step 1.

Where to find reader material, in this order:

- **Goodreads most-saved quotes, page 1 only.** `https://www.goodreads.com/work/quotes/<legacyId>`
  is sorted by how many readers saved each line. Page 1 is the fandom's collective memory.
  Later pages are just text. Read page 1 as a human before counting anything.
- **The book's Goodreads reviews** (capped at 30, but those 30 are the top-voted ones, which
  is exactly the signal I want).
- **Shelf and tag names** readers invented for the book.
- **Threads Olga pastes in.** Reddit must not be scraped around, so a pasted thread is the
  only route to fandom vocabulary and it beats everything above when available.

Only after those four answers exist do I generate candidates. Candidates come from the
answers. The corpus confirms them; it does not propose them.

## Step 2 — The reader test

Each candidate faces three questions. A no on any one kills it.

- **Would a reader screenshot this day?** The word plus the book together have to land.
  VEILS plus A Court of Mist and Fury lands. ANGER plus A Court of Silver Flames does not.
- **Is it equally at home in a business memo?** Then it is out. BEATS, STEAL, BEGUN, CHOSE,
  SHAME, LEANS, THINK, WOULD, THERE, ABOUT all pass the data gates easily and are worthless.
- **Is it a concrete thing from the genre's own world, or a mundane object the book made
  strange?** Those are the two shapes that work. Proven: THORN, GHOST, SIREN, REALM, CROWN,
  VENOM, WINGS, FANGS, HARPY, NYMPH, RELIC, RITES, OMENS, WRATH, GUILE, CODEX, SPICE, KNAVE.

## Step 3 — Playability (MEASURED, non-negotiable)

From 143 played days in PostHog project 443166, `booky_game_complete`. Baseline 89.3% win,
4.12 guesses. Three properties each cost 5-7 points of win rate and they STACK:

| penalties | win rate |
|---|---|
| 0 | 93.3% |
| 1 | 89.1% |
| 2 | 84.6% |
| 3 | 72.1% |

One penalty for each of: it is a proper name; it repeats a letter; it contains any of
J Q X Z V K W Y.

**Target zero. One is affordable when the word is worth it. Two is a bad day. Three is RAKER (44.6%).**

Names are the trap. A name can be the perfect reader word and still be the wrong answer,
because it costs 7 points. When a name is genuinely the best idea, say so out loud and let
Olga decide rather than quietly shipping it or quietly dropping it.

## Step 4 — Evidence

The word must have a count and a line. No count, no word. "It feels like this book" is not
evidence, including when step 1 produced it.

Source: Goodreads reader-saved quotes, `https://www.goodreads.com/work/quotes/<legacyId>?page=N`,
up to 20 pages at ~30 per page. `legacyId` comes from the book page HTML via
`/"legacyId":(\d+),"bestBook"/`. Never guess a legacyId; a guess returns zero quotes and
reads as an absence.

Two traps, both of which have burned me:

1. **Goodreads search returns study guides and summaries first.** Filter `tr[itemtype]` rows with
   `/study guide|summary|workbook|analysis|boxed|box set|trivia|conversation starters|unofficial|collection/i`
   and require `a.authorName` to match the real author.
2. **Page boilerplate.** The author name and title appear once per quote, so any token with
   `count >= 0.4 * quotes` is boilerplate, not vocabulary. Drops SARAH, LEIGH, HOLLY, CROWS,
   FLAME, QUEEN.

**Absence is only evidence when the corpus is big enough.** JEWEL at 0 in Gild is real: 8,224
five-letter tokens across 234 quotes. COAST at 0 in The Bridge Kingdom is NOT real: that corpus
is 196 tokens. State the corpus size with every zero, or the zero is a lie.

Minimum: **5 occurrences** in a corpus of 5,000+ tokens, or 4 if the line carrying it is one
of the book's most-saved quotes.

A fandom word (CHAIR, BAGEL) will fail this gate by design, because it is not in the prose.
That is allowed, but only on pasted reader material as the source, and it ships labelled as
a fandom word, never dressed up as canon.

## Step 5 — Does the week work?

A word is never judged alone. Check the finished week, not the slot.

- **Slot reality.** Index is `(date - epoch).days` against `booky/words.json`. The word must
  not appear earlier in `queue` (already played) or anywhere else in the future queue. Day
  >= today+1 only, never today or the past. It must be in `booky/dictionary.json` or added
  in the same change (adds are always allowed, never reject a real word for being missing).
- **Resolve the book through `wordBooksFrom`, not `wordBooks`.** Take every entry whose `from`
  is <= the target date and use the latest one. Reading `wordBooks` alone gives the wrong book.
  This has produced a wrong answer twice and Olga caught it both times.
- **No book twice inside five days.** One Dark Window on Sunday and Tuesday reads as a rut
  even though neither slot is broken.
- **Spread across the quarter.** No book gets more than about 8 of any 100 future days. From
  Blood and Ash sat at 24 of 178, which is why 13 of 21 broken slots were FBAA. Count before
  proposing, not after.
- **Protect the series cadences.** Zodiac Academy runs every Thursday and must never have a
  gap. Any change that touches a Thursday is checked against that chain first.

---

## Output format, every time

One row per word: date, word, book, occurrence count, corpus size, the confirming line,
penalty count, canon or fandom. Then the finished week as a table, and the per-book day
spread after the change.

Nothing is written to `booky/words.json` without Olga saying yes. `booky/daily-words.json`
must stay a byte-identical copy, and both validators
(`scripts/validate_daily_words_sync.py`, `scripts/validate_queue_lock.py`) must pass before
anything is committed.

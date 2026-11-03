# Booky word selection: the prompt I run on myself

Paste this whole file as the instruction for any word-research run, scheduled or manual.
It replaces every earlier method. Four gates, in order. A word that fails any gate is dead,
no matter how good it feels.

---

## The bar

A word a romantasy reader would be happy to see, that happens to be anchored to a book.
NOT "the word most statistically specific to this book." Specificity scoring ranks proper
nouns first by construction, which is why it kept producing character names, and names cost
7 points of win rate.

Two tiers are allowed:

- **Canon word** — appears in the book's own prose, repeatedly, in lines readers chose to save.
- **Fandom word** — what readers say about the book in their own words, not what the book says.
  CHAIR (Iron Flame), BAGEL (Fourth Wing) are the model. These are the best words the game has
  ever had and I cannot currently source them at volume (see Gate 3 blocker).

---

## Gate 0 — Is the slot real?

Compute the index as `(date - epoch).days` against `booky/words.json`. Then:

- The word must not appear anywhere earlier in `queue` (already played).
- The word must not appear anywhere else in the future queue (repeat).
- Never touch today's word or any past day. Day >= today+1 only.
- The word must be in `booky/dictionary.json`, or flagged as a dictionary add (adds are allowed,
  never reject a real word for being missing, but the add must happen in the same change).

## Gate 1 — Playability (MEASURED, non-negotiable)

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

## Gate 2 — Evidence (the hard gate)

The word must have a count and a line. No count, no word. "It feels like this book" is not evidence.

Source: Goodreads reader-saved quotes, `https://www.goodreads.com/work/quotes/<legacyId>?page=N`,
up to 20 pages at ~30 per page. `legacyId` comes from the book page HTML via
`/"legacyId":(\d+),"bestBook"/`.

Two traps, both of which have burned me:

1. **Goodreads search returns study guides and summaries first.** Filter `tr[itemtype]` rows with
   `/study guide|summary|workbook|analysis|boxed|box set|trivia|conversation starters|unofficial|collection/i`
   and require `a.authorName` to match the real author.
2. **Page boilerplate.** The author name and title appear once per quote, so any token with
   `count >= 0.4 * quotes` is boilerplate, not vocabulary. Drops SARAH, LEIGH, HOLLY, CROWS, FLAME, QUEEN.

**Absence is only evidence when the corpus is big enough.** JEWEL at 0 in Gild is real: 8,224
five-letter tokens across 234 quotes. COAST at 0 in The Bridge Kingdom is NOT real: that corpus is
196 tokens. State the corpus size with every zero, or the zero is a lie.

Minimum for a canon word: **5 occurrences** in a corpus of 5,000+ tokens, or 4 if the line
carrying it is one of the book's most-saved quotes.

## Gate 3 — Does a reader want to see it?

Run last, and it kills things that passed Gates 1 and 2.

- **Reject generic verbs and filler.** BEATS, STEAL, BEGUN, CHOSE, SHAME, LEANS, THINK, WOULD,
  THERE, ABOUT all pass Gate 2 easily and are worthless. If the word would be equally at home in
  a business memo, it is out.
- **Prefer concrete nouns from the genre's own world.** The best-received days are THORN, GHOST,
  SIREN, REALM, CROWN, VENOM, WINGS, FANGS, HARPY, NYMPH, RELIC, RITES, OMENS, WRATH, GUILE,
  CODEX, SPICE, KNAVE.
- **A mundane object is a gift when the book makes it strange.** PHONE in Crescent City. CHAIR in
  Iron Flame. The joke is the anchor.
- **Spread the books.** No book gets more than ~8 of any 100 future days. From Blood and Ash was at
  24 of 178 and that is why 13 of 21 broken slots were FBAA. Check the per-book day count before
  proposing, not after.

**Gate 3 is currently blocked for fandom words.** Goodreads hard-caps at 30 reviews per work and
ignores `?page=`, `?sort=` and `?rating=`. Search indexes retail pages. Tumblr and StoryGraph are
cross-origin from the Goodreads tab. Reddit must not be scraped around. Until Olga pastes threads
or authorises a Reddit API key, every word I ship is a canon word and I say so rather than
dressing one up as fandom.

---

## Output format, every time

One row per word. Date, word, book, occurrence count, corpus size, the confirming line,
penalty count. Then the per-book day spread after the change. Nothing is written to
`booky/words.json` without Olga saying yes, and `booky/daily-words.json` must stay a
byte-identical copy.

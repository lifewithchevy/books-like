# 90books — Google Search Console Indexing Checklist

Track manual "Request Indexing" submissions in Google Search Console. Sitemap submission tells Google the URLs exist; manual requests push them to the front of the crawl queue.

> **Daily cap:** Search Console allows ~10 manual indexing requests per day per property. Work through this list a few at a time.

**How to use:** In Search Console, paste the URL into the top search bar → wait for inspection → click "Request Indexing" → wait ~30s for confirmation → check the box here.

**Sitemap submitted:** ✅ 2026-05-24 (52 URLs discovered)

---

## TIER 1 — Highest priority (do these first)

- [x] `https://90books.com/` — homepage
- [x] `https://90books.com/genre/romantasy` — flagship genre page
- [ ] `https://90books.com/booky` — Booky daily romantasy game (formerly /daily — now 301 redirects)
- [x] `https://90books.com/books-like/fourth-wing` — 4,400 searches/mo
- [x] `https://90books.com/books-like/a-court-of-thorns-and-roses` — 5,400 searches/mo
- [ ] `https://90books.com/books-like/iron-flame` — Empyrean book 2
- [ ] `https://90books.com/books-like/crescent-city` — SJM crossover demand
- [ ] `https://90books.com/books-like/quicksilver` — Callie Hart 2024 breakout
- [ ] `https://90books.com/books-like/one-dark-window` — Rachel Gillig gothic romantasy

## TIER 2 — High priority romantasy

- [ ] `https://90books.com/books-like/from-blood-and-ash`
- [ ] `https://90books.com/books-like/the-cruel-prince`
- [ ] `https://90books.com/books-like/powerless`
- [ ] `https://90books.com/books-like/the-bridge-kingdom`
- [ ] `https://90books.com/books-like/heartless-hunter`
- [ ] `https://90books.com/books-like/the-jasad-heir`
- [ ] `https://90books.com/books-like/six-of-crows`
- [ ] `https://90books.com/books-like/twilight`

## TIER 3 — Dark romance / spicy adjacent

- [ ] `https://90books.com/books-like/twisted-love`
- [ ] `https://90books.com/books-like/haunting-adeline`
- [ ] `https://90books.com/books-like/king-of-wrath`
- [ ] `https://90books.com/books-like/the-risk`
- [ ] `https://90books.com/books-like/icebreaker`
- [ ] `https://90books.com/books-like/mile-high`
- [ ] `https://90books.com/books-like/the-love-hypothesis`

## TIER 4 — Adjacent-genre pages (SEO equity catchers)

- [ ] `https://90books.com/books-like/the-summer-i-turned-pretty`
- [ ] `https://90books.com/books-like/happy-place`
- [ ] `https://90books.com/books-like/book-lovers`
- [ ] `https://90books.com/books-like/funny-story`
- [ ] `https://90books.com/books-like/it-ends-with-us`
- [ ] `https://90books.com/books-like/verity`
- [ ] `https://90books.com/books-like/the-seven-husbands-of-evelyn-hugo`
- [ ] `https://90books.com/books-like/the-song-of-achilles`
- [ ] `https://90books.com/books-like/the-midnight-library`
- [ ] `https://90books.com/books-like/the-invisible-life-of-addie-larue`
- [ ] `https://90books.com/books-like/eleanor-oliphant-is-completely-fine`
- [ ] `https://90books.com/books-like/the-silent-patient`
- [ ] `https://90books.com/books-like/the-woman-in-cabin-10`
- [ ] `https://90books.com/books-like/a-good-girls-guide-to-murder`
- [ ] `https://90books.com/books-like/the-housemaid`

## TIER 5 — Genre + mood landing pages

- [ ] `https://90books.com/genre/fantasy`
- [ ] `https://90books.com/genre/romance`
- [ ] `https://90books.com/genre/thriller`
- [ ] `https://90books.com/genre/sci-fi`
- [ ] `https://90books.com/genre/literary`
- [ ] `https://90books.com/mood/swoony`
- [ ] `https://90books.com/mood/dark`
- [ ] `https://90books.com/mood/adventurous`
- [ ] `https://90books.com/mood/emotional`
- [ ] `https://90books.com/mood/tense`
- [ ] `https://90books.com/mood/cozy`
- [ ] `https://90books.com/mood/mysterious`
- [ ] `https://90books.com/mood/reflective`

---

## Progress

- **Indexed manually:** 4 / 52
- **Tier 1 progress:** 4 / 9
- **Sitemap auto-discovered:** all 52 (Google will crawl these on its own schedule even without manual request)

## Notes

- Pages NOT in this checklist but in the sitemap will still be indexed by Google's regular crawl — manual requests just accelerate it.
- If a page shows "Crawled — currently not indexed" in Search Console, that's normal for the first 2-4 weeks. Wait.
- If a page shows "URL is not on Google" after 4+ weeks, request indexing again or check for crawl errors in the **Pages** report.
- Run `node scripts/seo-audit.mjs` any time you ship major changes to verify the SEO basics still pass.

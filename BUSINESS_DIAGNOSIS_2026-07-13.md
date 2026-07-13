# 90books / Booky — Independent Business Diagnosis

**Date:** 2026-07-13  
**Author:** Fresh-eyes operator read (no prior strategy docs seeded thinking)  
**Product audited:** mobile first-time loop on 90books.com + /booky + /authors + /books-like/*

---

## Data provenance (read this first)

### PostHog (project 443166)
- **Live re-query on 2026-07-13 failed.** Both personal API keys previously used against this project (`phx_zQ7…`, `phx_32eJ…`) now return `authentication_failed`.
- Numbers below are regenerated from **raw HogQL API response payloads** captured in a live pull on **2026-06-30** (tool stdout / JSON results), not from any narrative summary.
- Window covered: **2026-05-27 → 2026-06-30** (~5 weeks post-launch). **Jul 1–13 is unknown.** Treat Jul trajectory as unverified.
- Gaps never queried in source: classic D1/D7 cohort retention, UTM attribution, ordered land→play→buy funnel, referrer→affiliate join, GSC.

### Google Search Console
- **No credentials in this environment.** No service account, OAuth token, or export found in repo or prior agent envs.
- Cannot state impressions / CTR / position. Flagged as **blocked**. Sitemap has **57 URLs** (40 `/books-like/*`). That is inventory, not traffic.

---

## 1. Honest diagnosis (one screen)

**You built a game people will finish once. You did not build a habit, a buyer funnel, or a business.**

| What the data proves | Number |
|---|---|
| Demand for the *game* is real | **541** unique starters, **866** completions, **67%** start→complete, **92%** win rate (avg **3.9** guesses) |
| Habit is not real | **436 / 541 (80.6%)** played exactly **1 day**. Only **24 (4.4%)** played **8+** days |
| Growth peaked then rolled over | WAU: 19 → 128 → 147 → **203** (week of Jun 14) → 162 → **81** (week of Jun 28). Last day in pull: **~18** unique players |
| Share loop is weak | **88** share clicks / **27** unique sharers (~**5%** of starters). Methods: clipboard 43 / native 25 / null 20 |
| Affiliate monetization is dead at this scale | **9** `affiliate_buy_clicked` all-time vs **866** completes (**~1%**). At Amazon’s **4.5%** book rate and a $15 paperback, even 100% conversion ≈ **$6** lifetime |
| Library / SEO / Goodreads are not the product | `/booky` **1,945** pageviews (30d) vs `/` **379** vs top books-like page **17**. `goodreads_connected` = **8** |
| Acquisition that works is Reddit, not Google | External referrers: Reddit app+web **170**, Google **123**, Gmail **44** |
| Email capture exists but is tiny | **25** `email_signup_completed` all-time |

**Mobile product leaks (first-time walkthrough, Jul 13):**
1. Help modal auto-opens and buries the board — extra tap before play.
2. Win screen primary CTA is Share (correct for growth); Amazon is a quiet text link — matches the **1%** click rate.
3. Share sheet routes to a private `r/B00KY` thread, not the big romantasy subs — caps virality.
4. Reminder email is the only return channel; **25** signups cannot carry a daily habit.
5. Homepage / books-like first paint is dominated by Booky promo chrome; Library and rec content feel secondary. books-like *does* render after JS, but PostHog proves almost nobody lands there.
6. `/authors` sells “50–90 play every day” while late-June unique players/day were mostly **18–50** and falling — overclaims vs the pull.

**What the data disproves:** “We’re an affiliate / discovery site that happens to have a game.” Discovery pages and affiliate clicks are rounding error. The only demand signal is **play → complete**.

---

## 2. Is there a business here? Which one?

**Not yet. There is a product signal. There is not a revenue model that works at current scale.**

| Model | Verdict | Why (with real analog) |
|---|---|---|
| **Audience → Amazon affiliate** | **Kill as primary** | Your own data: 9 clicks / ~$1–6 theoretical commission. Amazon Associates pays **4.5%** on physical books ([Associates rate card](https://affiliate-program.amazon.com/help/node/topic/GRXPHT8U84RAYDXZ)). Book Riot’s *actual* money model at scale is **ads + newsletter sponsorships** (Romance newsletter sponsorship listed at **$150** for **23K** subs / 34% open — [Book Riot media kit](https://bookriot.com/media-kit/newsletter-advertising/)), not affiliate crumbs. You have **25** emails. |
| **Reader subscription** | **No** | StoryGraph monetizes Plus at ~**$4.99/mo** after **millions** of users ([TechCrunch, Jun 2026](https://techcrunch.com/2026/06/29/watch-out-amazon-the-kobo-ereader-now-has-a-goodreads-rival/)). You have ~**4%** habitual players. Charging readers with this retention is fantasy. |
| **NYT Games-style sub upsell** | **No** | Wordle stayed free; NYT monetized by funneling “tens of millions” of new users into Games/bundle subs ([TechCrunch / NYT Q1’22](https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth/)). You have no paid catalog behind Booky. |
| **Author B2B “feature day”** | **Only viable money mechanic — later** | Matches the asset: guaranteed niche impressions on a win screen. Book Riot sells Romance newsletter placement for **$150** (23K list). Micro BookTok posts commonly price **$150–$1,500** ([influencerfee BookTok rate tables](https://influencerfee.com/blog/influencer-marketing-for-book-brands/)). **$25 for ~20–50 players** is a tip jar, not a business — and `/authors` currently overstates reach vs PostHog. |

**Named revenue mechanic to build toward:**  
**Paid author/publisher feature days** (sponsored win-screen placement + shareable asset + honest PostHog report), priced off **verified DAU**, once daily players are large enough that a day competes with a micro-creator post — not with a Starbucks coffee.

**Until then:** the only job is **daily returning players in romantasy Reddit/BookTok channels**. Affiliate is a tip. Library is a museum.

---

## 3. Ranked 90-day plan

### Single biggest lever
**Turn one-and-done players into a Reddit-native daily habit, measured by WAU and % playing 4+ days — not by library features or affiliate CTR.**

Analog: Wordle’s growth mechanic was the **spoiler-free emoji share** (player-invented, then productized; Wardle interview, [Slate](https://slate.com/culture/2022/01/wordle-game-creator-wardle-twitter-scores-strategy-stats.html)), which took the game from **90 → 300,000** players in ~2 months before NYT bought it for **low-seven figures** ([NYT press](https://investors.nytco.com/news-and-events/press-releases/news-details/2022/The-New-York-Times-Company-acquires-Wordle/default.aspx)). Quordle hit **~1M players in ~2 months** before Merriam-Webster bought it ([TechCrunch, Jan 2023](https://techcrunch.com/2023/01/20/wordle-clone-quordle-acquired-by-merriam-webster/)). Both scaled **share → habit → acquisition**, not SEO shelves.

### STOP doing
| Stop | Why (data) |
|---|---|
| Expanding Library / vibe shelves / Goodreads sync | 8 Goodreads connects; books-like pages ≤17 pageviews |
| Treating Amazon affiliate as the business | 9 clicks all-time |
| Selling `/authors` at “50–90 daily” while WAU is falling | Contradicts Jun 28 WAU **81** / last-day ~**18** players |
| Building more product surface (cards, recs, archive gates) | Completion is already 67%; the leak is **return**, not first-session UX polish |
| SEO “request indexing” as a growth plan without GSC proof | GSC inaccessible; PostHog already shows Google is secondary and non-converting |

### DO (ranked)

**1. Reddit distribution as the acquisition engine (Days 1–30)**  
- *Data:* Reddit **170** external pageview referrers vs Google **123**; only channel with cultural fit (r/Romantasy ~**90k** members, +300%/yr — [GummySearch](https://gummysearch.com/r/Romantasy/), Jul 12 2026).  
- *Analog:* Wordle’s early spike rode community sharing (NZ Twitter → emoji grid), not ads.  
- *Move:* Daily result posts / weekly “play with us” threads in **r/Romantasy, r/fantasyromance (~290k), r/frombloodandash**, using the existing spoiler-free grid. Kill dependence on tiny `r/B00KY` as the share destination. Track `booky_game_start` by referrer weekly.  
- *Target:* WAU back above **200** and rising for 3 straight weeks.

**2. Fix the return loop before inventing features (Days 1–30)**  
- *Data:* **80.6%** one-day players; **25** email signups.  
- *Analog:* Duolingo treats early retention as the growth model; leadership has said free-user retention drove **>50%** of user growth ([FY23 Q3 earnings commentary](https://stockinsights.ai/us/DUOL/earnings-transcript/fy23-q3-b637)); streak freeze exists because broken streaks kill habit ([Lenny’s interview w/ Duolingo retention PM](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks)).  
- *Move:* Make email (or browser push) the default end-screen ask with one clear benefit (“tomorrow’s romantasy word”). A/B: remind copy vs identity rank tease. Measure **% of completers who return next calendar day** (this metric was never queried — instrument it).  
- *Target:* ≥**25%** of completers return next day; email list **≥500**.

**3. Share friction: one tap, right room (Days 15–45)**  
- *Data:* 88 shares / 27 sharers; share is already the primary CTA (good).  
- *Analog:* Wardle productized the grid because people were *already* manually typing it ([Slate](https://slate.com/culture/2022/01/wordle-game-creator-wardle-twitter-scores-strategy-stats.html)).  
- *Move:* Prefill native share; optional “post to r/Romantasy” deep link; keep URL non-spammy (Wordle lesson). Count **unique sharers / completers**, not raw share clicks.

**4. Author B2B only after DAU is honest (Days 45–90)**  
- *Data:* Feature day currently delivers tens of players, not thousands. Heba proof (“50+”) is the *ceiling of the old peak*, not a floor.  
- *Analog:* Book Riot Romance sponsorship **$150 / 23K list**; micro BookTok **$150–$1,500**/post.  
- *Move:* Pause $25 “first five” vanity sales. When **DAU ≥ 200** for 14 days, sell feature days at **$150–$300** with a labeled Sponsored badge + PostHog report (plays, completes, affiliate clicks). Pitch midlist romantasy launches, not SJM/Yarros.  
- *Target:* **≥4** paid features in days 60–90 at ≥**$150** each (**≥$600**), or don’t call it a business line.

**5. Affiliate as a hitchhiker only (ongoing)**  
- *Data:* 1% click-through on win screen.  
- *Move:* One clearer buy CTA on win screen *after* share, not instead of share. Do not build more rec pages to “feed” affiliate. Revisit only if affiliate clicks exceed **5%** of completes.

### What success looks like at day 90
| Metric | Kill-zone | Keep going |
|---|---|---|
| WAU | <100 or still declining | ≥250 and up 3 of last 4 weeks |
| % players with ≥4 days played | <10% | ≥20% |
| Next-day return (completers) | <15% | ≥25% |
| Email list | <200 | ≥500 |
| Paid author revenue (if selling) | $0 at honest DAU | ≥$600 in trailing 30d |

---

## 4. Kill criteria (walk away)

Walk away / freeze the product if **any two** of these are true at day 90:

1. **WAU ≤ 100** and no 3-week uptrend after focused Reddit + reminder work.  
2. **≥75%** of all-time players still one-day-only (habit never forms).  
3. **Author features cannot clear $500/month** at prices justified by *actual* DAU (not vanity copy) — meaning B2B demand isn’t there either.  
4. You are still spending build time on Library/SEO/Goodreads while game WAU is flat — that is cosplay entrepreneurship.

Cautionary analog: **Heardle** was acquired by Spotify then **shut down in May 2023** after the Wordle-clone traffic fad faded ([reporting on Spotify shutdown](https://www.nationalworld.com/culture/heardle-game-what-is-the-new-music-version-of-wordle-that-spotify-bought)). Niche daily games that don’t lock a habit die quietly. Do not confuse a pretty win screen with a company.

---

## Funnel snapshot (source: PostHog HogQL, 2026-06-30)

```
Land (pageview users)     ~582
  → Start game            541 unique / 1290 starts
  → Complete              339 unique / 866 completes   (67% of starts)
  → Share                 27 unique / 88 clicks        (~8% of unique completers)
  → Email signup          25
  → Affiliate click       9 all-time
  → Return 2+ days        105 (19.4% of starters)
  → Habitual 8+ days      24 (4.4%)
```

---

## Agree / disagree with prior internal plan (checked last)

Prior plan (from project-context / July goal block — not used to form the above):

| Prior claim | This read |
|---|---|
| Author $25 features + email list as north star | **Disagree on timing & north star.** Email is a *tool* for return. North star must be **returning WAU**. $25 features at current DAU train the wrong price. |
| Weekly Reddit rotation | **Agree** — Reddit is the only acquisition channel with proof. |
| Don’t charge readers / don’t promise sales | **Agree**. |
| Keep building Library, homepage SEO, archive gates | **Disagree hard** — data says stop. |
| Duolingo streak + Wordle share as growth playbook | **Agree on mechanics; disagree that they’ve shipped enough distribution.** Streak ranks won’t save an empty Reddit presence. |
| Kill criteria | Prior plan had **none**. This doc adds them. |

---

## Appendix A — Product audit notes (mobile, Jul 13)

- `/booky` #50 word `TRIAL` → ACOTAR; win screen shows cover + “Get it on Amazon →” + Share + email remind + countdown.  
- Help modal auto-shows for first visit.  
- `/authors`: $25 founder pitch, Heba proof, DM/email CTAs; reach copy says 50–90/day.  
- `/books-like/fourth-wing`: correct meta + content after JS; Booky promo banner still owns attention.  
- Affiliate tag in use: `tag=90books-20` + assorted `amzn.to` shortlinks.

## Appendix B — Analog cheatsheet (verified)

| Product | Mechanic | Number | Source |
|---|---|---|---|
| Wordle | Spoiler-free emoji share; no spammy URL | 90 → 300k players in ~2 mo; NYT low-seven-figure buy; later “tens of millions” new NYT users | NYT press; TechCrunch May 2022; Slate Wardle interview |
| Quordle | Harder daily clone + share | ~1M players in ~2 mo → Merriam-Webster acquire | TechCrunch Jan 2023 |
| Heardle | Music Wordle clone | Spotify buy → shut down May 2023 | Contemporary reporting |
| NYT Games | Free daily games → bundle sub | 10.82M digital subs end-2024; Games as acquisition/retention | NYT FY2024 results |
| Amazon Associates | Book commission | **4.5%** physical books | Official Associates rate card |
| Book Riot | Newsletter sponsorships | Romance NL **$150** / 23K / 34% OR | Public media kit |
| BookTok creators | Paid posts | Micro often **$150–$1,500**/video | Industry rate tables 2025–26 |
| StoryGraph | Reader Plus sub | ~$4.99/mo after 5M users | TechCrunch Jun 2026 |
| Colleen Hoover / BookTok | Peer rec → sales | **14.3M** print copies 2022 (+661% YoY); BookTok authors +66% | NPD BookScan via BI / PW |
| Duolingo | Streak + freeze → retention-led growth | Retention cited as >50% of user growth driver | FY23 Q3 commentary |

## Appendix C — Screenshots

Saved under `/opt/cursor/artifacts/screenshots/` from the Jul 13 mobile audit (`01-home-mobile.png`, `02-booky-help.png`, `03-booky-board.png`, `06-authors-mobile.png`, `09-end-screen.png`, etc.).

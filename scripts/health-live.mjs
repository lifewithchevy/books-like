#!/usr/bin/env node
//
// Booky LIVE health check.  node scripts/health-live.mjs
//
// The scripts/validate_*.py guards read booky/words.json on disk. Since
// 2026-08-08 /api/booky-words serves that same file, so the two should agree —
// but a green validator still does not prove the DEPLOY landed. This checks
// what players actually get.
//
// It also covers the failure class uptime.yml cannot see: an unwinnable word,
// a day with no book, an expired giveaway and a nearly-empty queue all return
// HTTP 200. Exit 1 on any FAIL so CI can open an issue.

import fs from 'node:fs';

const WORDS = 'https://90books.com/api/booky-words';
// Same-origin. This used to point at booky-deploy.vercel.app, which went 404
// on 2026-08-04 and took the game down; the check then failed on the DICTIONARY
// line and returned early, so every later check (unwinnable word, runway,
// giveaway) silently stopped running. Check what players actually load.
const DICT = 'https://90books.com/booky/dictionary.json';
const APP = 'https://90books.com/api/booky-app';
const LOOKAHEAD = 14;
const MIN_RUNWAY = 30;

const fails = [];
const warns = [];
const notes = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const ok = (m) => notes.push(m);

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// Mirrors computeDayNumber() in booky/app.js (local midnight, 1-indexed).
function dayNumber(epochStr, today) {
  const [y, m, d] = epochStr.split('-').map(Number);
  return Math.floor((today.getTime() - new Date(y, m - 1, d).getTime()) / 86400000) + 1;
}

async function main() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const wr = await fetch(WORDS, { cache: 'no-store' });
  if (!wr.ok) { fail(`/api/booky-words returned ${wr.status}`); return done(); }
  const w = await wr.json();
  if (!w.epoch || !Array.isArray(w.queue) || !w.queue.length) {
    fail('/api/booky-words has no epoch or empty queue'); return done();
  }

  // A broken dictionary must not abort the run: the checks below (unwinnable
  // word, runway, giveaway) are the ones this script exists for.
  let dict = new Set();
  const dr = await fetch(`${DICT}?v=17`, { cache: 'no-store' });
  if (!dr.ok) {
    fail(`dictionary returned ${dr.status} — guesses cannot be validated`);
  } else {
    try {
      const dj = await dr.json();
      dict = new Set((Array.isArray(dj) ? dj : dj.words || []).map((x) => String(x).toUpperCase()));
      if (dict.size < 1000) fail(`dictionary looks truncated (${dict.size} words)`);
      else ok(`dictionary ${dict.size} words`);
    } catch (e) {
      fail(`dictionary is not valid JSON: ${e.message}`);
    }
  }

  const n = dayNumber(w.epoch, today);
  const runway = w.queue.length - n;
  ok(`today = Booky #${n}, word ${w.queue[n - 1]}, runway ${runway} days`);

  if (n < 1 || n > w.queue.length) fail(`today (#${n}) is outside the queue (len ${w.queue.length})`);
  if (runway < MIN_RUNWAY) fail(`queue runway ${runway} days, below ${MIN_RUNWAY}`);
  else if (runway < MIN_RUNWAY * 2) warn(`queue runway ${runway} days, plan a refill`);

  // Today + the next fortnight must be winnable and have a book, or the day is
  // dead on arrival: unwinnable = nobody can solve it, no book = no author value.
  const wb = w.wordBooks || {};
  for (let i = n; i < Math.min(n + LOOKAHEAD, w.queue.length + 1); i++) {
    const word = w.queue[i - 1];
    const date = iso(addDays(today, i - n));
    if (!word) { fail(`#${i} (${date}) has no word`); continue; }
    if (!dict.has(String(word).toUpperCase())) fail(`#${i} (${date}) word ${word} is UNWINNABLE (not in dictionary)`);
    if (!wb[word]) warn(`#${i} (${date}) word ${word} has no book mapped`);
  }

  // Giveaway: array of non-overlapping windows with unique tags. `tag` keys the
  // Resend contact record, so a duplicate merges two giveaways' entrants.
  const gv = w.giveaway;
  if (gv && !Array.isArray(gv)) fail('giveaway is not an array (app expects an array)');
  else if (Array.isArray(gv)) {
    const tags = new Set();
    let live = null;
    for (const g of gv) {
      for (const k of ['start', 'end', 'tag', 'title']) {
        if (!g?.[k]) fail(`giveaway entry missing "${k}": ${JSON.stringify(g).slice(0, 80)}`);
      }
      if (g?.tag) {
        if (tags.has(g.tag)) fail(`duplicate giveaway tag "${g.tag}" — entrants would merge`);
        tags.add(g.tag);
      }
      if (g?.start && g?.end) {
        if (g.start > g.end) fail(`giveaway "${g.tag}" starts after it ends`);
        if (iso(today) >= g.start && iso(today) <= g.end) live = g;
      }
    }
    const sorted = [...gv].filter((g) => g?.start && g?.end).sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start <= sorted[i - 1].end) {
        fail(`giveaway windows overlap: "${sorted[i - 1].tag}" and "${sorted[i].tag}"`);
      }
    }
    ok(live ? `giveaway live: "${live.title}" until ${live.end}` : 'no giveaway running today');
  }

  // app.js must come from this repo, else our fixes silently do not ship.
  const ar = await fetch(APP, { cache: 'no-store' });
  const src = ar.headers.get('x-booky-app');
  if (!ar.ok) fail(`/api/booky-app returned ${ar.status}`);
  else if (src && src !== 'local') fail(`app.js served from "${src}" — repo edits are NOT live`);
  else ok(`app.js served from ${src || 'local'}`);

  // THE CHECK THAT WOULD HAVE CAUGHT 2026-08-04.
  // Every asset above can be 200 while the game is still dead, because app.js
  // boots by awaiting Promise.all([queue, dictionary]) and ONE rejected fetch
  // blanks the page. That day the dictionary URL inside the served app.js
  // pointed at booky-deploy.vercel.app, which was 404ing, and every player got
  // "Couldn't load today's word" while every endpoint here looked fine.
  // So: read the URLs the SHIPPED app.js actually fetches and confirm each one
  // loads. Never trust that the URL in the repo is the URL that gets served,
  // api/booky-app.js rewrites them.
  if (ar.ok) {
    const js = await ar.text();
    // Matches fetch(...) and the fetchJSON(...) retry wrapper alike.
    const urls = [...js.matchAll(/fetch(?:JSON)?\(\s*['"]([^'"]+)['"]/g)]
      .map((m) => m[1])
      .filter((u) => /dictionary|booky-words/.test(u));
    if (!urls.length) fail('served app.js fetches neither the queue nor the dictionary');
    for (const u of urls) {
      const abs = u.startsWith('http') ? u : `https://90books.com${u}`;
      try {
        const r = await fetch(abs, { cache: 'no-store' });
        if (!r.ok) fail(`app.js boot fetch ${abs} returned ${r.status} — GAME IS DOWN`);
        else ok(`app.js boot fetch ok: ${u}`);
      } catch (e) {
        fail(`app.js boot fetch ${abs} threw ${e.message} — GAME IS DOWN`);
      }
    }
  }

  // Since 2026-08-08 `local` is the healthy source: prod serves this repo's
  // booky/words.json. The two other values both mean queue edits here are not
  // reaching players, which is silent — nothing 500s, the game just serves
  // someone else's words. So say so loudly.
  const wsrc = wr.headers.get('x-booky-words');
  if (wsrc === 'local') {
    ok('queue served from this repo (x-booky-words: local)');
  } else if (wsrc && wsrc.startsWith('proxy-booky-deploy')) {
    fail(`queue is PROXIED from booky-deploy (${wsrc}) — edits to booky/words.json in this repo are NOT reaching players. Check PROXY_UPSTREAM in api/booky-words.js`);
  } else if (wsrc && wsrc.startsWith('local-fallback')) {
    warn(`words served via the upstream-down fallback (${wsrc}) — the proxy is on and booky-deploy is broken`);
  }

  // Deploy drift. Green Vercel status is not proof the alias moved, and the
  // symptom is invisible: prod keeps serving an older queue while the repo
  // looks correct. Compare the live queue against the file on disk.
  try {
    const localWords = JSON.parse(
      fs.readFileSync(new URL('../booky/words.json', import.meta.url), 'utf8'),
    );
    const a = JSON.stringify(localWords.queue);
    const b = JSON.stringify(w.queue);
    if (a === b) {
      ok(`live queue matches booky/words.json (${w.queue.length} days)`);
    } else {
      const diffs = localWords.queue
        .map((x, i) => (x === w.queue[i] ? null : `day ${i + 1}: live ${w.queue[i]} vs repo ${x}`))
        .filter(Boolean);
      fail(
        `live queue differs from booky/words.json (live ${w.queue.length} days, repo ${localWords.queue.length}) — the deploy has not landed. ${diffs.slice(0, 5).join('; ') || 'length differs only'}`,
      );
    }
  } catch (e) {
    warn(`could not compare live queue to booky/words.json: ${e.message}`);
  }

  await triggerDailyEmail();


  // Buy links on the reveal cards. This is the last click before a possible
  // sale, and NOTHING else checks it: on 2026-08-16 Powerless pointed at the UK
  // edition, which 404s on amazon.com, and 15 books linked to an Amazon SEARCH
  // page instead of the book. A cloud routine cannot cover this because Amazon
  // and openlibrary are blocked by the agent egress proxy, but GitHub Actions
  // can reach them, so the check lives here.
  //
  // WARN, never FAIL: a red run is the alarm that emails Olga, and that alarm
  // is for "the game is broken", not "a bookshop link rotted". Amazon also
  // throttles datacentre IPs, so 403/429/503 means UNVERIFIABLE, not dead —
  // treating those as failures would cry wolf every few hours.
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  const upcoming = new Map();
  for (let i = n; i < Math.min(n + 7, w.queue.length + 1); i++) {
    const book = wb[w.queue[i - 1]];
    if (book?.buyUrl && !upcoming.has(book.slug)) upcoming.set(book.slug, book);
  }
  let dead = 0, unverifiable = 0;
  for (const [slug, book] of upcoming) {
    if (book.buyUrl.includes('/s?k=')) {
      warn(`${slug} buy link is an Amazon SEARCH url, not the book — readers land on results`);
      continue;
    }
    try {
      const r = await fetch(book.buyUrl, { redirect: 'follow', headers: { 'user-agent': UA } });
      if (r.status === 404 || r.status === 410) { warn(`${slug} buy link is DEAD (${r.status}): ${book.buyUrl}`); dead += 1; }
      else if (!r.ok) unverifiable += 1;
    } catch { unverifiable += 1; }
  }
  if (!dead) {
    ok(`buy links ok for the next 7 days (${upcoming.size} books${unverifiable ? `, ${unverifiable} unverifiable` : ''})`);
  }

  done();
}

// ---- The daily reminder is sent from here ----
//
// Not because a health check is the natural home for it, but because it is the
// only thing on a schedule that a session can edit. Vercel Cron is disabled for
// this project: its registration froze pinned to a 2026-07-15 deployment, so for
// a month subscribers got month-old email (dead unsubscribe link) while the
// domain served current code. Nothing moved the pin — see lib/daily-trigger.js.
//
// booky-health.yml runs this file every 3 hours. Most of those runs fall
// outside the 21:00-04:00 UTC send window and are simply told "not due" — the
// endpoint decides, not this script. In practice the 21:17 UTC slot is the one
// that sends, since GitHub delays these runs by roughly 45-150 minutes; see
// lib/daily-trigger.js for the measurements behind that window.
//
// Only runs in CI. A local `bash scripts/ship.sh` polls this file up to 20
// times, and none of those should be able to mail the list.
async function triggerDailyEmail() {
  if (!process.env.GITHUB_ACTIONS) return;

  try {
    const r = await fetch('https://90books.com/api/booky-send?trigger=1', {
      signal: AbortSignal.timeout(120000),
    });
    const body = await r.json().catch(() => ({}));

    if (!r.ok) {
      fail(`daily email trigger returned HTTP ${r.status}`);
      return;
    }
    if (body.skipped) {
      ok(`daily email not due: ${body.skipped}`);
      return;
    }
    // A dropped reminder is NOT self-healing — nothing re-sends tonight's mail —
    // so this has to be able to go red. It only ever warned, which is precisely
    // why ~50 subscribers a night were silently dropped to 429s for two nights
    // running while every health run reported success. The threshold keeps one
    // permanently-dead address from painting the run red nightly and training
    // the alarm to be ignored.
    if (body.failed > 0) {
      const total = (body.sent || 0) + body.failed;
      const msg = `daily email sent to ${body.sent}, FAILED for ${body.failed} of ${total}`;
      if (body.failed >= 3 && body.failed / total > 0.02) fail(msg);
      else warn(msg);
      return;
    }
    if (!body.sent) {
      fail(`daily email ran but sent to 0 subscribers`);
      return;
    }
    ok(`daily email sent to ${body.sent} subscriber(s)`);
  } catch (e) {
    fail(`daily email trigger failed: ${e.message}`);
  }
}

function done() {
  for (const m of notes) console.log(`ok    ${m}`);
  for (const m of warns) console.log(`WARN  ${m}`);
  for (const m of fails) console.log(`FAIL  ${m}`);
  console.log(fails.length ? `\n${fails.length} FAILURE(S)` : `\nhealthy${warns.length ? ` (${warns.length} warning(s))` : ''}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.log(`FAIL  health check crashed: ${e.message}`); process.exit(1); });

// Deploy pipeline restored 2026-08-06: main is complete again and this file
// reaching production is the proof that a push now deploys on its own.

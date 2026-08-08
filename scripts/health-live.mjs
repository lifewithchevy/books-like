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
  const dr = await fetch(`${DICT}?v=16`, { cache: 'no-store' });
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

  done();
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

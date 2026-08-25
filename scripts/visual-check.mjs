#!/usr/bin/env node
/**
 * scripts/visual-check.mjs — "does the site LOOK right", page by page.
 *
 *   node scripts/visual-check.mjs                 # check live prod
 *   node scripts/visual-check.mjs --base=http://localhost:3000
 *   node scripts/visual-check.mjs --shots=out/    # also save PNGs
 *
 * WHY THIS EXISTS. health-live.mjs answers "is the game alive" and uptime.yml
 * answers "does the page load". Both returned a cheerful `healthy` on
 * 2026-08-25 while /booky-library was rendering 2,435 px of raw SEO text where
 * the shelves should be, and while /genre/romantasy had no <h1> at all. Olga
 * found both by looking at the site. Nothing automated could see them, because
 * every one of those pages returned HTTP 200 with a correct <title>.
 *
 * So this checks the RENDERED PAGE in a real browser: what a reader actually
 * gets after the JS runs. It asserts layout invariants, not pixels — no
 * screenshot diffing, which cries wolf every time a book cover changes.
 *
 * Exit code 1 if any check fails, so CI can open an issue.
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const BASE = arg('base', 'https://90books.com').replace(/\/$/, '');
const SHOTS = arg('shots', '');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// Every page a reader can land on. `kind` picks which invariants apply.
const PAGES = [
  { path: '/',                                              kind: 'home' },
  { path: '/booky',                                         kind: 'game' },
  { path: '/booky-library',                                 kind: 'library' },
  { path: '/authors',                                       kind: 'static' },
  { path: '/about',                                         kind: 'static' },
  { path: '/contact',                                       kind: 'static' },
  { path: '/genre/romantasy',                               kind: 'genre' },
  { path: '/books-like/fourth-wing',                        kind: 'detail' },
  { path: '/books-like/a-court-of-thorns-and-roses',         kind: 'detail' },
  { path: '/books-like/twilight',                           kind: 'detail' },
  { path: '/books-like/throne-of-glass',                    kind: 'detail' },
  { path: '/books-like/quicksilver',                        kind: 'detail' },
  { path: '/books-like/six-of-crows',                       kind: 'detail' },
  { path: '/books-like/the-cruel-prince',                   kind: 'detail' },
  { path: '/books-like/one-dark-window',                    kind: 'detail' },
  { path: '/books-like/house-of-earth-and-blood',           kind: 'detail' },
  { path: '/books-like/from-blood-and-ash',                 kind: 'detail' },
  { path: '/books-like/iron-flame',                         kind: 'detail' },
  { path: '/books-like/heartless-hunter',                   kind: 'detail' },
  { path: '/books-like/the-jasad-heir',                     kind: 'detail' },
  { path: '/books-like/the-serpent-and-the-wings-of-night',  kind: 'detail' },
  { path: '/books-like/weavingshaw',                        kind: 'detail' },
];

/** Everything the checks need, read from the rendered page in one pass. */
function probe() {
  const vis = (e) => {
    if (!e) return false;
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.height > 0 && r.width > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const top = (e) => (e ? Math.round(e.getBoundingClientRect().top + window.scrollY) : null);
  const blk = document.getElementById('seo-static-block');
  const text = document.body.innerText || '';
  return {
    title: document.title,
    h1s: [...document.querySelectorAll('h1')].filter(vis).map((h) => h.textContent.trim()),
    h1sInDom: document.querySelectorAll('h1').length,
    textLen: text.replace(/\s+/g, ' ').trim().length,
    docHeight: document.body.scrollHeight,
    seoBlock: blk ? { visible: vis(blk), top: top(blk), height: Math.round(blk.getBoundingClientRect().height) } : null,
    covers: [...document.querySelectorAll('img')].filter((i) => vis(i) && i.naturalWidth > 40).length,
    // The library's real UI, and the two footers that were duplicating.
    libraryShelves: (() => { const e = document.getElementById('bklLibraryShelves'); return e ? { visible: vis(e), top: top(e) } : null; })(),
    legacyLibraryFooter: vis(document.getElementById('bklLibraryFooter')),
    authorCtaCount: (text.match(/Are you a romantasy author\?/g) || []).length,
    featuredCtaCount: (text.match(/Get your book featured/g) || []).length,
    // A page that renders the homepage hero under a non-home URL is the exact
    // failure mode that made 38 pages unindexable.
    homeHeadlineVisible: [...document.querySelectorAll('.lp-headline')].some(vis),
    gameTiles: document.querySelectorAll('[class*=tile]').length,
  };
}

const CHECKS = {
  common: (p, d) => {
    const f = [];
    if (!d.title || d.title.length < 10) f.push(`title missing or too short: ${JSON.stringify(d.title)}`);
    if (d.textLen < 400) f.push(`page has almost no visible text (${d.textLen} chars) — likely rendered blank`);
    if (d.docHeight < 700) f.push(`page is only ${d.docHeight}px tall — likely rendered blank`);
    if (d.h1s.length === 0) f.push('no visible <h1>');
    if (d.h1s.length > 1) f.push(`${d.h1s.length} visible <h1>: ${JSON.stringify(d.h1s)}`);
    if (d.legacyLibraryFooter) f.push('legacy #bklLibraryFooter is VISIBLE again — it duplicates the site footer');
    if (d.authorCtaCount > 1) f.push(`author CTA appears ${d.authorCtaCount}x`);
    if (d.featuredCtaCount > 1) f.push(`"Get your book featured" appears ${d.featuredCtaCount}x`);
    return f;
  },
  home:    () => [],
  game:    (p, d) => (d.gameTiles < 30 ? [`game board missing (${d.gameTiles} tiles)`] : []),
  static:  () => [],
  library: (p, d) => {
    const f = [];
    if (d.seoBlock) f.push('the plain-text SEO block is rendering on the library — it duplicates the shelves');
    if (!d.libraryShelves || !d.libraryShelves.visible) f.push('library shelves are not rendering');
    if (d.covers < 10) f.push(`only ${d.covers} book covers loaded — shelves look empty`);
    return f;
  },
  genre: (p, d) => {
    const f = [];
    if (!d.seoBlock || !d.seoBlock.visible) f.push('SEO block is not visible — the page has no heading or intro');
    else if (d.seoBlock.top > 1200) f.push(`SEO heading sits ${d.seoBlock.top}px down, below the shelves instead of above them`);
    if (d.homeHeadlineVisible) f.push('homepage hero is showing under a /genre/ URL');
    return f;
  },
  detail: (p, d) => {
    const f = [];
    if (!d.seoBlock || !d.seoBlock.visible) f.push('SEO block missing — this is what made 38 pages unindexable');
    else if (d.seoBlock.top < 400) f.push(`SEO block sits at ${d.seoBlock.top}px, above the book view instead of below it`);
    if (d.homeHeadlineVisible) f.push('homepage hero is showing under a /books-like/ URL');
    if (d.h1s.length === 1 && /daily romantasy word game/i.test(d.h1s[0])) f.push(`h1 is the homepage headline: ${JSON.stringify(d.h1s[0])}`);
    return f;
  },
};

const browser = await chromium.launch();
const results = [];
for (const page of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const tab = await ctx.newPage();
  const jsErrors = [];
  tab.on('pageerror', (e) => jsErrors.push(e.message));
  let failures = [];
  let data = null;
  try {
    await tab.goto(BASE + page.path, { waitUntil: 'networkidle', timeout: 45000 });
    // Wait for the SPA to actually place the server-rendered block rather than
    // guessing with a sleep — probing mid-render reported it "missing" on
    // whichever pages happened to still be settling.
    if (page.kind === 'detail' || page.kind === 'genre') {
      await tab.waitForFunction(() => window.__seoBlockPlaced === true, null, { timeout: 15000 }).catch(() => {});
    }
    await tab.waitForTimeout(800);
    data = await tab.evaluate(probe);
    failures = [...CHECKS.common(page, data), ...(CHECKS[page.kind] || (() => []))(page, data)];
    if (jsErrors.length) failures.push(`JS error: ${jsErrors[0].split('\n')[0]}`);
    if (SHOTS) {
      const name = (page.path.replace(/\//g, '_') || '_home') + '.png';
      writeFileSync(`${SHOTS}/${name}`, await tab.screenshot({ fullPage: true }));
    }
  } catch (e) {
    failures = [`could not load: ${e.message.split('\n')[0]}`];
  }
  results.push({ ...page, failures, data });
  await ctx.close();
}
await browser.close();

const bad = results.filter((r) => r.failures.length);
for (const r of results) {
  console.log(`${r.failures.length ? 'FAIL' : 'ok  '}  ${r.path}`);
  for (const f of r.failures) console.log(`        - ${f}`);
}
console.log(`\n${results.length - bad.length}/${results.length} pages look right.`);
if (bad.length) {
  console.log('\nPages needing a look: ' + bad.map((b) => b.path).join(', '));
  process.exit(1);
}

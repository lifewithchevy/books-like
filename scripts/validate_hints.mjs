#!/usr/bin/env node
//
// scripts/validate_hints.mjs — proves the hint sheet can show a book for every
// scheduled word without anyone checking it by hand.
//
// It does NOT re-implement the hint logic. It lifts the real functions out of
// booky/app.js and runs them, so if that code changes this validator changes
// with it. A copy would drift, and a validator that drifts is worse than none.
//
// For every word from today onward it asserts:
//   - a book is mapped, and the cover file exists on disk
//   - the book resolves to a link (Amazon, or the curated books-like page)
//
// Exit 1 on any failure, so ship.sh refuses the deploy.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = fs.readFileSync(path.join(root, 'booky/app.js'), 'utf8');

// Pull the real functions out by brace matching rather than a fragile regex.
function grab(name) {
  const start = appSrc.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`validate_hints: ${name}() not found in app.js`);
  let depth = 0;
  let i = appSrc.indexOf('{', start);
  for (let k = i; k < appSrc.length; k++) {
    if (appSrc[k] === '{') depth++;
    else if (appSrc[k] === '}' && --depth === 0) return appSrc.slice(start, k + 1);
  }
  throw new Error(`validate_hints: ${name}() is unbalanced`);
}
const curated = appSrc.match(/const CURATED_SLUGS = new Set\(\[[\s\S]*?\]\);/);
if (!curated) throw new Error('validate_hints: CURATED_SLUGS not found in app.js');

// Build the lifted functions inside one scope that owns the globals they read
// (ANSWER, HINTS, STATE, DAY). eval() at module top level would not bind them.
const harness = [curated[0], grab('bookLinkTarget')].join('\n');
const factory = new Function(`
  const VOWELS = 'AEIOU';
  const posthog = { capture() {} };
  const saveHints = () => {};
  const renderHints = () => {};
  let ANSWER = '', HINTS = {}, STATE = { guesses: [] }, DAY = 1;
  ${harness}
  return { bookLinkTarget };
`);
const hint = factory();

const data = JSON.parse(fs.readFileSync(path.join(root, 'booky/words.json'), 'utf8'));
const books = data.wordBooks || {};
const queue = data.queue.map((x) => (typeof x === 'string' ? x : x && x.word)).filter(Boolean);

// Same day maths the game uses: day 1 is the epoch date, in local time.
const epoch = new Date(`${data.epoch}T00:00:00`);
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayNumber = Math.round((today - epoch) / 86400000) + 1;
const from = Math.max(0, todayNumber - 1);

const fail = [];

for (let i = from; i < queue.length; i++) {
  const ANSWER = queue[i];
  const DAY = i + 1;
  const where = `#${DAY} ${ANSWER}`;
  const book = books[ANSWER];
  if (!book) { fail.push(`${where}: no book mapped, the book hint would be missing`); continue; }
  const cover = String(book.cover || '').replace(/^\/booky\//, 'booky/');
  if (!cover || !fs.existsSync(path.join(root, cover))) fail.push(`${where}: cover file missing (${book.cover})`);
  if (!hint.bookLinkTarget(book)) fail.push(`${where}: no Amazon link and not a curated slug, the link would hide`);

}

const checked = queue.length - from;
if (fail.length) {
  console.error(`hints: ${fail.length} problem(s) across ${checked} scheduled words`);
  fail.slice(0, 20).forEach((f) => console.error(`  - ${f}`));
  if (fail.length > 20) console.error(`  ... and ${fail.length - 20} more`);
  process.exit(1);
}
console.log(`hints: OK — ${checked} scheduled words all have a book, a cover and a link.`);

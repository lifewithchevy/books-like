#!/usr/bin/env node
//
// Past games keep their book. node scripts/validate_book_history.mjs [--freeze]
//
// A word can map to different books on different dates (words.json
// `wordBooksFrom`), so it is easy to rewrite what an old day showed without
// meaning to: change a word's mapping and every earlier play of it, plus the
// archive, silently changes with it. That happened once (EARTH, HOUSE and SIREN
// re-run for Zodiac Academy, 2026-10-14) and is exactly what must never happen.
//
// This guards it two ways:
//  1. scripts/book-history.json freezes the WORD and the book (slug) every day
//     up to today showed. If today's words.json resolves any frozen day to a different
//     book, ship fails. Run with --freeze after each day goes live to extend
//     the record; it refuses to change a day that is already frozen.
//  2. The lookup exists in four places (lib/book-for.js, booky/app.js, the
//     archive page and the library bundle) because the browser ones cannot require a module. They must
//     be the same function, so this extracts all three and compares them, then
//     runs them against every day.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { bookFor } = createRequire(import.meta.url)(path.join(root, 'lib/book-for.js'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const data = JSON.parse(read('booky/words.json'));
const queue = data.queue;
const HISTORY = path.join(root, 'scripts/book-history.json');
const fail = [];

// ---- day maths: day 1 is the epoch, today is local midnight (as the game does)
const [ey, em, ed] = data.epoch.split('-').map(Number);
const t = new Date(); t.setHours(0, 0, 0, 0);
const today = Math.round((t - new Date(ey, em - 1, ed)) / 86400000) + 1;
const dateOf = (day) => new Date(Date.UTC(ey, em - 1, ed + day - 1)).toISOString().slice(0, 10);

// ---- 1. the three copies are one function
function extractFn(src, where) {
  const i = src.indexOf('function bookFor');
  if (i < 0) { fail.push(`${where}: function bookFor not found`); return null; }
  let depth = 0, k = src.indexOf('{', i);
  for (let j = k; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1);
  }
  fail.push(`${where}: unbalanced braces in bookFor`); return null;
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();
// The library page's hashed bundle is served immutable, so it is found through
// index.html rather than by a fixed name (editing it means a NEW hashed name).
const bundleName = (read('index.html').match(/\/(app\.[0-9a-f]{12}\.js)/) || [])[1];
if (!bundleName) fail.push('index.html does not reference an app.<hash>.js bundle');
const copies = {
  'lib/book-for.js': extractFn(read('lib/book-for.js'), 'lib/book-for.js'),
  'booky/app.js': extractFn(read('booky/app.js'), 'booky/app.js'),
  'booky/archive/index.html': extractFn(read('booky/archive/index.html'), 'booky/archive/index.html'),
  ...(bundleName ? { [bundleName]: extractFn(read(bundleName), bundleName) } : {}),
};
const ref = copies['lib/book-for.js'];
for (const [where, src] of Object.entries(copies)) {
  if (src && ref && norm(src) !== norm(ref)) fail.push(`${where}: bookFor differs from lib/book-for.js. Copy it across, they must be identical.`);
}
const fns = Object.fromEntries(Object.entries(copies).filter(([, s]) => s).map(([k, s]) => [k, new Function(`${s}; return bookFor;`)()]));
for (let day = 1; day <= queue.length; day++) {
  const want = bookFor(data, queue[day - 1], day);
  for (const [where, fn] of Object.entries(fns)) {
    const got = fn(data, queue[day - 1], day);
    if ((got && got.slug) !== (want && want.slug)) fail.push(`${where}: day ${day} (${queue[day - 1]}) resolves to ${got && got.slug}, lib says ${want && want.slug}`);
  }
}

// ---- dated entries must be well formed
for (const [word, list] of Object.entries(data.wordBooksFrom || {})) {
  if (!data.wordBooks[word]) fail.push(`wordBooksFrom.${word} has no default in wordBooks`);
  for (const e of list) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.from || '')) fail.push(`wordBooksFrom.${word}: bad "from" ${JSON.stringify(e.from)}`);
    for (const k of ['slug', 'title', 'cover', 'buyUrl']) if (!e[k]) fail.push(`wordBooksFrom.${word} entry ${e.from} is missing "${k}"`);
  }
}

// ---- 2. frozen history
const resolved = (day) => (bookFor(data, queue[day - 1], day) || {}).slug || null;
let hist = { frozenThrough: 0, words: [], slugs: [] };
try { hist = JSON.parse(fs.readFileSync(HISTORY, 'utf8')); } catch { /* first run */ }

if (process.argv.includes('--freeze')) {
  const upTo = Math.min(today, queue.length);
  for (let day = 1; day <= hist.frozenThrough; day++) {
    if (resolved(day) !== hist.slugs[day - 1]) fail.push(`refusing to freeze: day ${day} is already frozen as ${hist.slugs[day - 1]} but resolves to ${resolved(day)}`);
    if (queue[day - 1] !== hist.words[day - 1]) fail.push(`refusing to freeze: day ${day} is already frozen as ${hist.words[day - 1]} but the queue has ${queue[day - 1]}`);
  }
  if (!fail.length) {
    for (let day = hist.frozenThrough + 1; day <= upTo; day++) { hist.slugs[day - 1] = resolved(day); hist.words[day - 1] = queue[day - 1]; }
    hist.frozenThrough = upTo;
    fs.writeFileSync(HISTORY, JSON.stringify(hist) + '\n');
    console.log(`froze ${upTo} days (through ${dateOf(upTo)})`);
  }
} else {
  for (let day = 1; day <= hist.frozenThrough; day++) {
    const was = hist.slugs[day - 1], now = resolved(day);
    if (queue[day - 1] !== hist.words[day - 1]) fail.push(`PAST WORD CHANGED: day ${day} (${dateOf(day)}) was ${hist.words[day - 1]}, queue now has ${queue[day - 1]}`);
    else if (now !== was) fail.push(`PAST GAME CHANGED: day ${day} (${dateOf(day)}, ${queue[day - 1]}) showed ${was}, now resolves to ${now}`);
  }
  const lag = Math.min(today, queue.length) - hist.frozenThrough;
  if (lag > 7) console.warn(`note: book history is ${lag} days behind; run  node scripts/validate_book_history.mjs --freeze`);
}

if (fail.length) {
  console.error('FAIL book history:\n  ' + fail.join('\n  '));
  process.exit(1);
}
console.log(`ok: ${Object.keys(copies).length} copies of bookFor agree on ${queue.length} days; ${hist.frozenThrough} past days unchanged`);

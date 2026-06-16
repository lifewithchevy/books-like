#!/usr/bin/env node
// Cross-references mentions across all 9 successful Reddit-mine datasets
// to surface real consensus picks for each homepage shelf, without needing
// the trope-specific queries that Reddit keeps rate-limiting.
//
// Each shelf has a TOPIC: a weighted set of source datasets where that
// shelf's vibe is best represented. A book's score = sum(mentions in
// those datasets × dataset weight). We rank and print the top.
//
// USAGE: node cross-shelf.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, 'data');

// Lightweight alias map — duplicated here so we don't import analyze.mjs's giant one.
const BOOKS = JSON.parse(readFileSync(resolve(__dirname, 'books.json'), 'utf8'));

function tallyFile(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!data.threads || data.threads.length === 0) return null;
  const out = new Map(); // key → { threads, comments }
  for (const thread of data.threads) {
    const seen = new Set();
    const haystackThread = ((thread.title || '') + ' ' + (thread.selftext || '')).toLowerCase();
    for (const b of BOOKS) if (b.aliases.some(a => haystackThread.includes(a))) seen.add(b.key);
    for (const c of thread.comments) {
      const body = (c.body || '').toLowerCase();
      for (const b of BOOKS) {
        if (b.aliases.some(a => body.includes(a))) {
          seen.add(b.key);
          const cur = out.get(b.key) || { threads: 0, comments: 0 };
          cur.comments += 1;
          out.set(b.key, cur);
        }
      }
    }
    for (const k of seen) {
      const cur = out.get(k) || { threads: 0, comments: 0 };
      cur.threads += 1;
      out.set(k, cur);
    }
  }
  return out;
}

// Load every populated data file
const tallies = {};
for (const f of readdirSync(DATA).filter(n => n.endsWith('.json'))) {
  const t = tallyFile(resolve(DATA, f));
  if (t) tallies[f.replace(/\.json$/, '')] = t;
}

console.log('Loaded datasets:', Object.keys(tallies).join(', '));

// SHELF DEFINITIONS — each maps to a weighted set of source datasets.
// Weights reflect how representative each dataset is of the shelf's vibe.
const SHELVES = {
  'Swoony Reads': {
    sources: {
      'books-like-it-ends-with-us': 1.0,
      'books-like-acotar': 0.8,
      'books-like-fourth-wing': 0.6,
      'books-like-seven-husbands-evelyn-hugo': 0.4,
    },
    exclude: [], // No exclusions — let real data drive
  },
  'Enemies to Lovers': {
    sources: {
      'books-like-acotar': 1.0,
      'books-like-fourth-wing': 1.0,
    },
    exclude: ['it ends with us', 'the seven husbands of evelyn hugo', 'a little life', 'the song of achilles', 'circe', 'where the crawdads sing'],
  },
  'Dark Romance': {
    sources: {
      'books-like-verity': 1.0,
      'books-like-acotar': 0.4,
      'books-like-fourth-wing': 0.3,
    },
    exclude: ['it ends with us', 'beach read', 'funny story', 'people we meet on vacation', 'the hating game', 'the love hypothesis'],
  },
  'Book Club Reads': {
    sources: {
      'books-like-seven-husbands-evelyn-hugo': 1.0,
      'books-everyone-should-read': 0.8,
      'most-recommended-books-ever': 0.8,
      'books-like-the-song-of-achilles': 0.4,
    },
    exclude: ['fourth wing', 'a court of thorns and roses', 'throne of glass', 'six of crows', 'iron flame', 'onyx storm', 'powerless', 'twilight', 'the cruel prince', 'from blood and ash'],
  },
  'Epic Fantasy': {
    sources: {
      'books-like-fourth-wing': 1.0,
      'most-recommended-books-ever': 0.4,
    },
    exclude: ['it ends with us', 'verity', 'the song of achilles', 'circe', 'a little life', 'yellowface', 'normal people', 'the midnight library', 'gone girl', 'beach read', 'funny story', 'twisted love', 'haunting adeline', 'the love hypothesis', 'people we meet on vacation', 'happy place', 'icebreaker'],
  },
  'Books That Stay With You': {
    sources: {
      'books-like-the-song-of-achilles': 1.0,
      'books-like-the-midnight-library': 0.8,
      'books-like-seven-husbands-evelyn-hugo': 0.6,
      'most-recommended-books-ever': 0.5,
    },
    exclude: ['fourth wing', 'a court of thorns and roses', 'throne of glass', 'iron flame', 'powerless', 'twilight', 'six of crows', 'the cruel prince', 'from blood and ash', 'it ends with us', 'ugly love', 'verity', 'gone girl', 'haunting adeline', 'twisted love', 'icebreaker', 'beach read', 'funny story', 'the love hypothesis'],
  },
  'Cozy Reads': {
    sources: {
      'books-like-the-midnight-library': 0.8,
      'books-like-it-ends-with-us': 0.4,
      'books-like-verity': 0.3,
    },
    exclude: ['it ends with us', 'verity', 'gone girl', 'twilight', 'the silent patient', 'the housemaid', 'the woman in cabin 10', 'a little life', 'haunting adeline', 'twisted love', 'fourth wing', 'a court of thorns and roses', 'throne of glass', 'powerless', 'from blood and ash', 'mexican gothic', 'the secret history'],
  },
};

for (const [shelf, def] of Object.entries(SHELVES)) {
  const score = new Map();
  for (const [src, weight] of Object.entries(def.sources)) {
    const t = tallies[src];
    if (!t) continue;
    for (const [book, counts] of t) {
      if (def.exclude.includes(book)) continue;
      const s = score.get(book) || { weighted: 0, threads: 0, comments: 0 };
      s.weighted += counts.threads * weight + counts.comments * weight * 0.05;
      s.threads += counts.threads;
      s.comments += counts.comments;
      score.set(book, s);
    }
  }
  const ranked = [...score.entries()]
    .sort((a, b) => b[1].weighted - a[1].weighted)
    .slice(0, 12);
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`${shelf}`);
  console.log(`Sources: ${Object.entries(def.sources).map(([k,v]) => `${k}×${v}`).join(', ')}`);
  console.log('──────────────────────────────────────────────────────');
  ranked.forEach(([book, s], i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. score ${s.weighted.toFixed(1).padStart(6)} (${s.threads}t/${s.comments}c)  ${book}`);
  });
}

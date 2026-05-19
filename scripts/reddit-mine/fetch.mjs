#!/usr/bin/env node
// Reddit mining — free, public, no auth.
//
// Uses Reddit's public JSON endpoints (reddit.com/r/SUB/search.json,
// reddit.com/comments/ID.json) which are still openly accessible in 2026.
// No API key, no paid tier, no scraping. We identify ourselves with a
// User-Agent (Reddit's stated requirement) and rate-limit politely.
//
// USAGE:
//   node fetch.mjs "books like fourth wing" RomanceBooks Fantasy suggestmeabook
//
// Output: data/<slug>.json — raw thread bodies + flattened comments.
// Then Claude (in the next step) reads that file and extracts/counts book
// mentions. This separation keeps the fetcher dumb and deterministic.
//
// Honest disclosure: this is best-effort. Reddit's public JSON endpoints
// are unofficial and could change. Rate limits apply (~60 req/min). For
// 5 queries × 4 subs × 10 threads × ~1 comment fetch = ~200 requests,
// which takes ~4 minutes at our pacing.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const UA = '90books-research/1.0 (book-recommendation-site; contact via 90books.com)';
const PAUSE_MS = 1100; // ~55 req/min — stays under Reddit's 60/min for unauthenticated GETs
const MAX_THREADS_PER_SUB = 10;
const MAX_COMMENTS_PER_THREAD = 200;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) {
    console.warn(`  ! ${r.status} ${url}`);
    return null;
  }
  return r.json();
}

async function searchSub(sub, query) {
  const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&t=all&limit=25`;
  const data = await fetchJson(url);
  if (!data || !data.data || !data.data.children) return [];
  // Keep threads with at least 10 comments — low-engagement posts add noise
  return data.data.children
    .map(c => c.data)
    .filter(t => t.num_comments >= 10)
    .slice(0, MAX_THREADS_PER_SUB)
    .map(t => ({
      id: t.id,
      sub: t.subreddit,
      title: t.title,
      selftext: t.selftext || '',
      score: t.score,
      num_comments: t.num_comments,
      permalink: t.permalink,
      created_utc: t.created_utc,
    }));
}

// Walks Reddit's nested comment tree and returns a flat array of comment bodies.
function flattenComments(node, out, depth) {
  if (!node || depth > 6) return;
  if (Array.isArray(node)) { node.forEach(n => flattenComments(n, out, depth)); return; }
  if (node.kind === 'Listing' && node.data && Array.isArray(node.data.children)) {
    node.data.children.forEach(c => flattenComments(c, out, depth));
    return;
  }
  if (node.kind === 't1' && node.data) {
    const body = (node.data.body || '').trim();
    if (body && body !== '[deleted]' && body !== '[removed]') {
      out.push({ score: node.data.score || 0, body });
    }
    if (node.data.replies) flattenComments(node.data.replies, out, depth + 1);
  }
}

async function fetchThreadComments(thread) {
  const url = `https://www.reddit.com${thread.permalink}.json?limit=${MAX_COMMENTS_PER_THREAD}&sort=top`;
  const data = await fetchJson(url);
  if (!Array.isArray(data) || data.length < 2) return [];
  const comments = [];
  flattenComments(data[1], comments, 0);
  return comments;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node fetch.mjs "<query>" <sub1> [sub2] [sub3] ...');
    console.error('Example: node fetch.mjs "books like fourth wing" RomanceBooks Fantasy suggestmeabook');
    process.exit(1);
  }
  const query = args[0];
  const subs = args.slice(1);
  const slug = slugify(query);

  const result = {
    query,
    subs,
    fetchedAt: new Date().toISOString(),
    threads: [],
  };

  for (const sub of subs) {
    console.log(`\n# r/${sub} — searching "${query}"`);
    const threads = await searchSub(sub, query);
    console.log(`  found ${threads.length} threads (≥10 comments)`);
    await sleep(PAUSE_MS);
    for (const t of threads) {
      console.log(`  → ${t.score}↑ ${t.num_comments}💬 ${t.title.slice(0, 70)}`);
      const comments = await fetchThreadComments(t);
      console.log(`    pulled ${comments.length} comments`);
      result.threads.push({ ...t, comments });
      await sleep(PAUSE_MS);
    }
  }

  const out = resolve(DATA_DIR, `${slug}.json`);
  writeFileSync(out, JSON.stringify(result, null, 2));
  const totalComments = result.threads.reduce((s, t) => s + t.comments.length, 0);
  console.log(`\n✓ Wrote ${out}`);
  console.log(`  ${result.threads.length} threads, ${totalComments} comments`);
}

main().catch(e => { console.error(e); process.exit(1); });

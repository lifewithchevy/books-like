// Enrich seo-recs.mjs with ISBNs for every rec.
//
// Pass 1 (free, instant): for each rec, look up its title in index.html's
//   BOOK_ISBN map. Most popular books are already in there.
// Pass 2 (free, slower): for remaining recs, query Open Library's public
//   search API by title + author. No auth required, just polite pacing.
//
// Writes back to seo-recs.mjs in place. Run from project root:
//   node scripts/enrich-seo-isbns.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SEO_PATH = join(ROOT, 'seo-recs.mjs');
const INDEX_PATH = join(ROOT, 'index.html');

// ─────────────────────────────────────────────────────────────────────────────
// Pass 0: extract BOOK_ISBN from index.html
// ─────────────────────────────────────────────────────────────────────────────
function extractBookIsbnMap() {
  const html = readFileSync(INDEX_PATH, 'utf8');
  // Match the BOOK_ISBN block: const BOOK_ISBN = { 'title': 'isbn', ... };
  const blockMatch = html.match(/const BOOK_ISBN\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (!blockMatch) {
    console.error('Could not locate BOOK_ISBN in index.html');
    process.exit(1);
  }
  const body = blockMatch[1];
  const map = {};
  // Match lines like:  'title':  '9781649374042',
  const lineRe = /'([^']+)'\s*:\s*'([\dxX]{10,13})'/g;
  let m;
  while ((m = lineRe.exec(body)) !== null) {
    map[normalizeKey(m[1])] = m[2];
  }
  return map;
}

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[''']/g, '')      // strip curly + straight apostrophes
    .replace(/[^a-z0-9]+/g, ' ') // collapse punctuation to spaces
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 2: Open Library lookup
// ─────────────────────────────────────────────────────────────────────────────
async function fetchOpenLibraryIsbn(title, author) {
  const params = new URLSearchParams({
    title: title,
    author: author,
    limit: '5',
    fields: 'isbn,title,author_name,language',
  });
  const url = `https://openlibrary.org/search.json?${params}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': '90books.com-seo-enrich/1.0 (one-time data backfill)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const docs = data.docs || [];
    // Prefer English ISBN-13 starting with 9780 or 9781
    for (const doc of docs) {
      const isbns = doc.isbn || [];
      const isbn13 = isbns.find(i => /^978[01]\d{9}$/.test(i));
      if (isbn13) return isbn13;
    }
    // Fall back to any ISBN-13
    for (const doc of docs) {
      const isbns = doc.isbn || [];
      const isbn13 = isbns.find(i => /^97[89]\d{10}$/.test(i));
      if (isbn13) return isbn13;
    }
    // Last resort: any ISBN-10
    for (const doc of docs) {
      const isbns = doc.isbn || [];
      const isbn10 = isbns.find(i => /^[\d]{9}[\dX]$/i.test(i));
      if (isbn10) return isbn10;
    }
    return null;
  } catch (e) {
    console.error(`  ⚠ fetch error for "${title}":`, e.message);
    return null;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Main: walk seo-recs.mjs line-by-line, inject isbn into each rec
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const isbnMap = extractBookIsbnMap();
  console.log(`Pass 0: extracted ${Object.keys(isbnMap).length} ISBNs from index.html`);

  let seoText = readFileSync(SEO_PATH, 'utf8');
  const lines = seoText.split('\n');

  // Regex: matches the rec object line. Supports both single-line and
  // multi-line `why` strings via lazy match. We require the line to END with
  // `},` (the close of one rec). title and author are easy to extract; we
  // skip recs that already have isbn (to make the script idempotent).
  // Example matches:
  //   { title: 'Throne of Glass', author: 'Sarah J. Maas', why: '...' },
  const recLineRe = /^(\s*\{ title: ')([^']+)(', author: ')([^']+)(', why: '.*'\s*)(\},.*)$/;

  let pass1Hits = 0;
  let pass2Hits = 0;
  let misses = 0;
  const toLookup = []; // entries needing Open Library

  // PASS 1: in-memory fill from BOOK_ISBN
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('isbn:')) continue; // already enriched
    const m = line.match(recLineRe);
    if (!m) continue;
    const [, head, title, mid, author, why, tail] = m;
    const key = normalizeKey(title);
    if (isbnMap[key]) {
      lines[i] = `${head}${title}${mid}${author}${why}, isbn: '${isbnMap[key]}' ${tail}`;
      pass1Hits++;
    } else {
      toLookup.push({ lineIdx: i, title, author, head, mid, why, tail });
    }
  }
  console.log(`Pass 1: filled ${pass1Hits} via BOOK_ISBN`);
  console.log(`Pass 2: ${toLookup.length} recs need Open Library lookup`);

  // PASS 2: Open Library (rate-limited: ~1 req/sec, polite)
  for (let j = 0; j < toLookup.length; j++) {
    const { lineIdx, title, author, head, mid, why, tail } = toLookup[j];
    process.stdout.write(`  [${j + 1}/${toLookup.length}] ${title} — ${author} ... `);
    const isbn = await fetchOpenLibraryIsbn(title, author);
    if (isbn) {
      lines[lineIdx] = `${head}${title}${mid}${author}${why}, isbn: '${isbn}' ${tail}`;
      pass2Hits++;
      console.log(`✓ ${isbn}`);
    } else {
      misses++;
      console.log(`✗ no match`);
    }
    await sleep(1100); // ~1 req/sec to be a good citizen
  }

  writeFileSync(SEO_PATH, lines.join('\n'), 'utf8');
  console.log(`\n✓ wrote ${SEO_PATH}`);
  console.log(`  Pass 1 (BOOK_ISBN): ${pass1Hits}`);
  console.log(`  Pass 2 (Open Library): ${pass2Hits}`);
  console.log(`  Misses: ${misses}`);
}

main().catch(e => { console.error(e); process.exit(1); });

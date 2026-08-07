// Download every cover referenced by booky/words.json into booky/covers/ and
// rewrite words.json to point at the local copies.
//
// Why: remote covers were the slowest thing on the win screen. Amazon's
// P/<isbn> URLs answer 200 with a 1x1 GIF (so onerror never fires and the
// client burned a ~2s openlibrary lookup before showing anything), and
// covers.openlibrary.org is two redirects deep into an archive.org ZIP
// extraction, ~1.3-1.8s. Same-origin files are one hop off our own CDN.
//
// Run: node scripts/fetch-covers.mjs [--force]
// Then commit booky/covers/ + booky/words.json together.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORDS = path.join(ROOT, 'booky', 'words.json');
const OUT_DIR = path.join(ROOT, 'booky', 'covers');
const LOCAL_PREFIX = '/booky/covers/';
// The card renders the cover at 60x90 CSS px, so 240px wide covers 4x displays
// and still lands well under 40KB.
const WIDTH = 240;
const force = process.argv.includes('--force');

fs.mkdirSync(OUT_DIR, { recursive: true });
const words = JSON.parse(fs.readFileSync(WORDS, 'utf8'));

// One file per book, keyed by slug — most covers are shared by several words.
const bySlug = new Map();
for (const book of Object.values(words.wordBooks || {})) {
  if (!book?.slug || !book.cover) continue;
  if (book.cover.startsWith(LOCAL_PREFIX)) continue;
  if (!bySlug.has(book.slug)) bySlug.set(book.slug, book.cover);
}

let saved = 0;
const failed = [];
for (const [slug, url] of bySlug) {
  const file = path.join(OUT_DIR, `${slug}.jpg`);
  if (fs.existsSync(file) && !force) continue;
  try {
    const buf = execFileSync('curl', ['-sL', '--max-time', '30', url], {
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'buffer',
    });
    // Amazon's dead-ASIN placeholder is a 43-byte 1x1 GIF. Anything this small
    // is not a book cover, and writing it would just move the bug local.
    if (buf.length < 3000) {
      failed.push(`${slug} (placeholder, ${buf.length}B) ${url}`);
      continue;
    }
    fs.writeFileSync(file, buf);
    execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', String(WIDTH), file, '--out', file], {
      stdio: 'ignore',
    });
    saved += 1;
  } catch (e) {
    failed.push(`${slug} (${e.message.split('\n')[0]}) ${url}`);
  }
}

// Repoint every word whose book now has a local file.
let repointed = 0;
for (const book of Object.values(words.wordBooks || {})) {
  if (!book?.slug) continue;
  if (!fs.existsSync(path.join(OUT_DIR, `${book.slug}.jpg`))) continue;
  const local = `${LOCAL_PREFIX}${book.slug}.jpg`;
  if (book.cover === local) continue;
  book.cover = local;
  repointed += 1;
}
fs.writeFileSync(WORDS, JSON.stringify(words, null, 2) + '\n');

console.log(`downloaded ${saved}, repointed ${repointed} words`);
if (failed.length) {
  console.log(`\nno usable image (${failed.length}) — these need a hand-sourced cover:`);
  for (const f of failed) console.log('  ' + f);
}

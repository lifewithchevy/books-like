#!/usr/bin/env node
// Extracts and counts book-title mentions from a fetched Reddit dataset.
//
// Strategy:
//  1. Load a canonical book-title alias map (built from the site's
//     existing bookMetadata + searchData entries). This is the universe
//     of books we want to detect.
//  2. For each comment, do a case-insensitive search for every alias.
//     Count distinct THREADS a book appears in (not raw mentions) so a
//     single ranty comment doesn't inflate the score.
//  3. Output a ranked CSV/JSON of book → thread-count.
//
// We trust the alias map to be reasonably complete for the books we
// care about. Books not in our catalog won't be detected here.
//
// USAGE: node analyze.mjs data/<file>.json

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Build the alias map from a static list. These are the books we
// actively curate; we treat each book's title plus common nicknames as
// detection patterns. Aliases must be lowercased; we'll match case-insensitive.
const BOOKS = [
  // Romantasy / fantasy romance
  { key: 'fourth wing', aliases: ['fourth wing', 'empyrean', 'rebecca yarros'] },
  { key: 'iron flame', aliases: ['iron flame'] },
  { key: 'onyx storm', aliases: ['onyx storm'] },
  { key: 'a court of thorns and roses', aliases: ['acotar', 'a court of thorns and roses', 'court of thorns', 'feyre', 'sarah j. maas', 'sarah j maas', 'sjm'] },
  { key: 'a court of mist and fury', aliases: ['acomaf', 'a court of mist and fury', 'court of mist'] },
  { key: 'from blood and ash', aliases: ['from blood and ash', 'fbaa', 'jennifer l. armentrout', 'jennifer armentrout', 'jlarmentrout', 'jla'] },
  { key: 'powerless', aliases: ['powerless', 'lauren roberts'] },
  { key: 'quicksilver', aliases: ['quicksilver', 'callie hart'] },
  { key: 'when the moon hatched', aliases: ['when the moon hatched', 'sarah a parker', 'sarah a. parker'] },
  { key: 'the serpent and the wings of night', aliases: ['serpent and the wings of night', 'tsatwon', 'carissa broadbent', 'crowns of nyaxia'] },
  { key: 'the cruel prince', aliases: ['the cruel prince', 'cruel prince', 'holly black', 'folk of the air', 'jude and cardan'] },
  { key: 'the bridge kingdom', aliases: ['the bridge kingdom', 'bridge kingdom', 'danielle l. jensen', 'danielle jensen'] },
  { key: 'throne of glass', aliases: ['throne of glass', 'tog', 'celaena'] },
  { key: 'six of crows', aliases: ['six of crows', 'leigh bardugo', 'kaz brekker'] },
  { key: 'heartless hunter', aliases: ['heartless hunter', 'crimson moth', 'kristen ciccarelli'] },
  { key: 'the jasad heir', aliases: ['the jasad heir', 'jasad heir', 'sara hashem'] },
  { key: 'zodiac academy', aliases: ['zodiac academy', 'caroline peckham'] },
  { key: 'red rising', aliases: ['red rising', 'pierce brown'] },
  { key: 'the priory of the orange tree', aliases: ['priory of the orange tree', 'priory', 'samantha shannon'] },
  { key: 'the hunger games', aliases: ['the hunger games', 'hunger games', 'katniss', 'suzanne collins'] },
  { key: 'the will of the many', aliases: ['will of the many', 'james islington'] },
  { key: 'an ember in the ashes', aliases: ['ember in the ashes', 'sabaa tahir'] },
  { key: 'crescent city', aliases: ['crescent city', 'house of earth and blood', 'hoeab'] },
  { key: 'the foxglove king', aliases: ['foxglove king', 'hannah whitten'] },
  { key: 'a touch of darkness', aliases: ['touch of darkness', 'scarlett st. clair', 'scarlett st clair'] },
  { key: 'neon gods', aliases: ['neon gods', 'katee robert'] },
  { key: 'serpent & dove', aliases: ['serpent and dove', 'serpent & dove', 'shelby mahurin'] },
  { key: 'kingdom of the wicked', aliases: ['kingdom of the wicked', 'kerri maniscalco'] },
  { key: 'this woven kingdom', aliases: ['this woven kingdom', 'tahereh mafi'] },
  { key: 'divine rivals', aliases: ['divine rivals', 'rebecca ross'] },
  { key: 'the hurricane wars', aliases: ['hurricane wars', 'thea guanzon'] },
  { key: 'babel', aliases: ['babel', 'r.f. kuang', 'rf kuang', 'rebecca kuang'] },
  { key: 'the atlas six', aliases: ['the atlas six', 'atlas six', 'olivie blake'] },

  // Contemporary romance
  { key: 'it ends with us', aliases: ['it ends with us', 'iews', 'lily bloom', 'colleen hoover', 'coho'] },
  { key: 'ugly love', aliases: ['ugly love'] },
  { key: 'verity', aliases: ['verity', 'colleen hoover'] },
  { key: 'twisted love', aliases: ['twisted love', 'ana huang'] },
  { key: 'king of wrath', aliases: ['king of wrath', 'kings of sin'] },
  { key: 'haunting adeline', aliases: ['haunting adeline', 'h.d. carlton', 'hd carlton'] },
  { key: 'icebreaker', aliases: ['icebreaker', 'hannah grace', 'maple hills'] },
  { key: 'funny story', aliases: ['funny story', 'emily henry'] },
  { key: 'beach read', aliases: ['beach read'] },
  { key: 'people we meet on vacation', aliases: ['people we meet on vacation', 'pwmov'] },
  { key: 'happy place', aliases: ['happy place'] },
  { key: 'the love hypothesis', aliases: ['the love hypothesis', 'love hypothesis', 'ali hazelwood'] },
  { key: 'the hating game', aliases: ['the hating game', 'hating game', 'sally thorne'] },
  { key: 'the spanish love deception', aliases: ['spanish love deception', 'elena armas'] },
  { key: 'the summer i turned pretty', aliases: ['the summer i turned pretty', 'tsitp', 'jenny han'] },
  { key: 'bride', aliases: ['bride'] },

  // Thriller / mystery
  { key: 'gone girl', aliases: ['gone girl', 'gillian flynn'] },
  { key: 'the silent patient', aliases: ['silent patient', 'alex michaelides'] },
  { key: 'the woman in cabin 10', aliases: ['woman in cabin 10', 'ruth ware'] },
  { key: "a good girl's guide to murder", aliases: ['good girl', 'aggtm', 'holly jackson', 'pip fitz'] },
  { key: 'the housemaid', aliases: ['the housemaid', 'freida mcfadden'] },
  { key: 'mexican gothic', aliases: ['mexican gothic', 'silvia moreno-garcia'] },
  { key: 'the maid', aliases: ['the maid', 'molly the maid', 'nita prose'] },
  { key: 'the thursday murder club', aliases: ['thursday murder club', 'richard osman'] },

  // Literary
  { key: 'the seven husbands of evelyn hugo', aliases: ['evelyn hugo', 'seven husbands', 'taylor jenkins reid'] },
  { key: 'the midnight library', aliases: ['midnight library', 'matt haig'] },
  { key: 'the song of achilles', aliases: ['song of achilles', 'tsoa', 'madeline miller', 'patroclus'] },
  { key: 'circe', aliases: ['circe', 'madeline miller'] },
  { key: 'a little life', aliases: ['a little life', 'hanya yanagihara'] },
  { key: 'normal people', aliases: ['normal people', 'sally rooney'] },
  { key: 'tomorrow, and tomorrow, and tomorrow', aliases: ['tomorrow and tomorrow and tomorrow', 'tomorrow x3', 'gabrielle zevin'] },
  { key: 'yellowface', aliases: ['yellowface'] },
  { key: 'where the crawdads sing', aliases: ['where the crawdads sing', 'crawdads'] },
  { key: 'piranesi', aliases: ['piranesi', 'susanna clarke'] },
  { key: 'recursion', aliases: ['recursion', 'blake crouch'] },
  { key: 'the secret history', aliases: ['the secret history', 'donna tartt'] },
  { key: 'the house in the cerulean sea', aliases: ['cerulean sea', 'tj klune'] },
  { key: 'legends & lattes', aliases: ['legends and lattes', 'legends & lattes', 'travis baldree'] },
  { key: 'my year of rest and relaxation', aliases: ['my year of rest and relaxation', 'ottessa moshfegh'] },
  { key: 'twilight', aliases: ['twilight', 'stephenie meyer'] },
];

function tally(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  // Map: book key → Set of thread IDs that mentioned it
  const threadHits = new Map();
  const commentHits = new Map();
  BOOKS.forEach(b => { threadHits.set(b.key, new Set()); commentHits.set(b.key, 0); });

  for (const thread of data.threads) {
    const seenInThread = new Set();
    // Check thread title + selftext
    const haystackThread = ((thread.title || '') + ' ' + (thread.selftext || '')).toLowerCase();
    for (const b of BOOKS) {
      if (b.aliases.some(a => haystackThread.includes(a))) seenInThread.add(b.key);
    }
    // Check each comment
    for (const c of thread.comments) {
      const body = (c.body || '').toLowerCase();
      for (const b of BOOKS) {
        if (b.aliases.some(a => body.includes(a))) {
          seenInThread.add(b.key);
          commentHits.set(b.key, commentHits.get(b.key) + 1);
        }
      }
    }
    for (const k of seenInThread) threadHits.get(k).add(thread.id);
  }

  const rows = BOOKS.map(b => ({
    key: b.key,
    threads: threadHits.get(b.key).size,
    comments: commentHits.get(b.key),
  })).filter(r => r.threads > 0)
    .sort((a, b) => b.threads - a.threads || b.comments - a.comments);

  return { query: data.query, totalThreads: data.threads.length, rows };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  // Default: analyze every populated file in data/
  const dataDir = resolve(__dirname, 'data');
  const files = readdirSync(dataDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const path = resolve(dataDir, f);
    const size = readFileSync(path).length;
    if (size < 1000) { continue; } // Skip empty fetches
    console.log('\n=====================================================');
    const result = tally(path);
    console.log(`Query: "${result.query}"  (${result.totalThreads} threads)`);
    console.log('Top mentions (threads / total comment hits):');
    result.rows.slice(0, 20).forEach((r, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${r.threads.toString().padStart(3)} / ${r.comments.toString().padStart(4)}  ${r.key}`);
    });
  }
} else {
  for (const file of args) {
    const result = tally(file);
    console.log(`Query: "${result.query}"  (${result.totalThreads} threads)`);
    result.rows.forEach((r, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${r.threads.toString().padStart(3)} threads, ${r.comments.toString().padStart(4)} comments  ${r.key}`);
    });
  }
}

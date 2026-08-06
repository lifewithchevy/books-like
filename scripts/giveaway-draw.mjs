#!/usr/bin/env node
// scripts/giveaway-draw.mjs — draw the giveaway winner and send the two Aug 4 emails.
//
// Entrants are Resend contacts whose `last_name` equals the giveaway `tag`
// (see api/booky-subscribe.js — last_name is the entry marker, first_name is
// the streak). Nothing else records an entry, so this is the only source of
// truth for the draw.
//
// GIVEAWAY #1 IS SENT BY HAND. Use --draw to pick the winner and --preview to
// get the copy, then send from Resend yourself. Do not use --send this time.
//
// Nothing sends unless you pass --send AND --yes. Everything else is read-only.
//
//   node scripts/giveaway-draw.mjs                  # count entrants, sanity check
//   node scripts/giveaway-draw.mjs --preview        # write both emails to HTML files
//   node scripts/giveaway-draw.mjs --draw           # pick the winner, save it, stop
//   node scripts/giveaway-draw.mjs --redraw         # winner never claimed, pick another
//   node scripts/giveaway-draw.mjs --send winner --yes
//   node scripts/giveaway-draw.mjs --send list --yes
//
// The draw is saved to .giveaway-draw-<tag>.json (gitignored) so re-running
// never silently re-rolls a winner you already emailed.
//
// Env (from Vercel):  vercel env pull .env.local
//   RESEND_API_KEY, RESEND_AUDIENCE_ID, RESEND_FROM

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import EMAILS from '../lib/giveaway-emails.js';

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// ---- args ----
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };

const TAG      = val('--tag', 'giveaway-nyaxia');
const SEND     = val('--send', null);          // 'winner' | 'list'
const CONFIRM  = has('--yes');
const PREVIEW  = has('--preview');
const DRAW     = has('--draw');
const REDRAW   = has('--redraw');

if (SEND && !['winner', 'list'].includes(SEND)) {
  fail(`--send must be "winner" or "list", got "${SEND}"`);
}

// ---- env ----
loadDotEnv(path.join(REPO, '.env.local'));
const KEY         = process.env.RESEND_API_KEY;
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const FROM        = process.env.RESEND_FROM || 'Olga from Booky <hello@90books.com>';
const UNSUB       = '<mailto:hello@90books.com?subject=unsubscribe>';

// ---- giveaway config, straight from the file that drives the live card ----
const words = JSON.parse(fs.readFileSync(path.join(REPO, 'booky', 'words.json'), 'utf8'));
const list  = Array.isArray(words.giveaway) ? words.giveaway : [words.giveaway].filter(Boolean);
const GA    = list.find((g) => g && g.tag === TAG);
if (!GA) fail(`No giveaway with tag "${TAG}" in booky/words.json. Found: ${list.map((g) => g.tag).join(', ')}`);

// ASIN comes out of the cover URL (.../P/<asin>.01.LZZZZZZZ.jpg), so the buy
// link can never point at a different book than the card showed.
const ASIN = (GA.cover || '').match(/\/P\/([A-Z0-9]{10})\./)?.[1] || null;

// Attribution note: UTM params are useless on an Amazon URL — the reader leaves
// our domain, so PostHog never fires. Two things measure this link instead:
//   1. CLICKS  — Resend click tracking, per destination URL. Already on.
//   2. ORDERS  — a per-placement Amazon Associates tracking ID. Associates
//      reports earnings per ID, so a dedicated one is the only way to tell
//      email-driven orders from win-screen ones. Create `90books-email-20` at
//      associates.amazon.com (Account Settings > Manage Tracking IDs), then set
//      AMZ_TAG below. Until it exists, an unknown tag silently earns nothing,
//      so this stays on the main ID.
const AMZ_TAG = process.env.AMZ_TAG || '90books-20';

// ascsubtag rides along for per-placement reporting on accounts that surface it.
// Harmless if ignored, and it never affects the commission.
const SUBTAG = `booky-email-${TAG}`;
const BUYURL = ASIN
  ? `https://www.amazon.com/dp/${ASIN}?tag=${AMZ_TAG}&ascsubtag=${SUBTAG}`
  : `https://www.amazon.com/s?k=${encodeURIComponent(GA.title)}&tag=${AMZ_TAG}&ascsubtag=${SUBTAG}`;

const PLAYURL = 'https://90books.com/booky?utm_source=giveaway_result&utm_medium=email&utm_campaign=nyaxia_giveaway&utm_content=result_email';

const DRAW_FILE = path.join(REPO, `.giveaway-draw-${TAG}.json`);

// Days the winner has to reply with a shipping address before you redraw.
const CLAIM_DAYS = 7;

main().catch((e) => fail(e.stack || String(e)));

async function main() {
  if (PREVIEW && !SEND && !DRAW) {
    // Preview needs no API key and no real winner.
    const out = writePreviews({ winnerName: 'Sarah K.', entries: 87 });
    console.log(`Previews written:\n  ${out.join('\n  ')}`);
    return;
  }

  if (!KEY || !AUDIENCE_ID) {
    fail('RESEND_API_KEY / RESEND_AUDIENCE_ID missing.\n  Run: vercel env pull .env.local');
  }

  const contacts = await fetchContacts();
  const active   = contacts.filter((c) => !c.unsubscribed);
  const entrants = active.filter((c) => (c.last_name || '') === TAG);

  console.log(`Giveaway : ${GA.title} (${TAG})`);
  console.log(`Window   : ${GA.start} -> ${GA.end}, announce ${GA.announce}`);
  console.log(`Contacts : ${contacts.length} total, ${active.length} active`);
  console.log(`Entrants : ${entrants.length}`);
  console.log(`Buy link : ${BUYURL}`);

  if (entrants.length === 0) {
    fail('Zero entrants. Do NOT send anything. Check that the entry tag is being\n' +
         '  written to last_name (api/booky-subscribe.js) before announcing a winner.');
  }

  const draw = loadOrCreateDraw(entrants);
  const winner = draw.winner;
  console.log(`\nWINNER   : ${winner.email}  (drawn ${draw.drawn_at}${draw.reused ? ', reused from ' + path.basename(DRAW_FILE) : ', saved'})`);

  const winnerName = EMAILS.displayName(winner.email);
  // Everyone, not just entrants. Non-entrants are the point: release day is the
  // one commercial moment, and seeing what they missed is what gets them to
  // enter the next one. Copy is written to land for both groups.
  const others = active.filter((c) => c.email !== winner.email);
  console.log(`Announcement audience: ${others.length} (all active subscribers, minus the winner)`);

  if (PREVIEW) {
    const out = writePreviews({ winnerName, entries: entrants.length });
    console.log(`\nPreviews written:\n  ${out.join('\n  ')}`);
  }

  if (!SEND) {
    console.log('\nNothing sent (read-only). To send:');
    console.log('  node scripts/giveaway-draw.mjs --send winner --yes');
    console.log('  node scripts/giveaway-draw.mjs --send list --yes');
    return;
  }
  if (!CONFIRM) fail('--send requires --yes. Refusing to email anyone by accident.');

  if (SEND === 'winner') {
    const { subject, html, text } = EMAILS.winnerEmail({ ga: GA, winnerName });
    const ok = await sendOne(winner.email, subject, html, text, 'giveaway-winner');
    console.log(ok ? `Sent winner email to ${winner.email}` : `FAILED to send to ${winner.email}`);
    if (ok) markSent('winner');
    return;
  }

  const { subject, html, text } = EMAILS.listEmail({ ga: GA, winnerName, entries: entrants.length, amzTag: AMZ_TAG });
  let sent = 0, failed = 0;
  for (const c of others) {
    const ok = await sendOne(c.email, subject, html, text, 'giveaway-result');
    ok ? sent++ : failed++;
    await new Promise((r) => setTimeout(r, 600)); // Resend allows 2 req/s; stay well under
  }
  console.log(`Announcement sent: ${sent}, failed: ${failed}`);
  if (sent) markSent('list');
}

// ---------------------------------------------------------------- data

async function fetchContacts() {
  const r = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) fail(`Resend contacts fetch failed ${r.status}: ${await r.text()}`);
  return (await r.json()).data || [];
}

function loadOrCreateDraw(entrants) {
  const prev = fs.existsSync(DRAW_FILE)
    ? JSON.parse(fs.readFileSync(DRAW_FILE, 'utf8'))
    : null;

  if (prev && !REDRAW) {
    // Re-drawing after you have already emailed someone would be a disaster,
    // so an existing draw always wins unless you ask for a redraw explicitly.
    return { ...prev, reused: true };
  }

  // Redraw: the previous winner never claimed. Everyone already drawn is out,
  // and the old winner is kept in the file so the history stays auditable.
  const burned = new Set(prev ? [prev.winner.email, ...(prev.passed || [])] : []);
  const pool = entrants.filter((e) => !burned.has(e.email));
  if (REDRAW) {
    if (!prev) fail('--redraw but no previous draw exists. Use --draw first.');
    if (pool.length === 0) fail('Everyone has been drawn already. Nothing left to redraw from.');
    console.log(`Redrawing: ${burned.size} previous winner(s) excluded, ${pool.length} left in the pool.`);
  }

  if (!DRAW && !SEND && !REDRAW) {
    // Read-only run with no saved draw: show a provisional pick but don't commit.
    const provisional = entrants[crypto.randomInt(entrants.length)];
    console.log('\n(no draw saved yet — the winner below is provisional, run --draw to lock it in)');
    return { winner: provisional, drawn_at: 'not yet', reused: false };
  }
  // crypto.randomInt, not Math.random: unbiased and not seedable, so the draw
  // is defensible if a reader ever asks how the winner was picked.
  const winner = pool[crypto.randomInt(pool.length)];
  const rec = {
    tag: TAG,
    winner: { email: winner.email, id: winner.id },
    passed: prev ? [prev.winner.email, ...(prev.passed || [])] : [],
    entries: entrants.length,
    entrant_emails: entrants.map((e) => e.email),
    drawn_at: new Date().toISOString(),
    sent: {},
  };
  fs.writeFileSync(DRAW_FILE, JSON.stringify(rec, null, 2));
  return { ...rec, reused: false };
}

function markSent(which) {
  if (!fs.existsSync(DRAW_FILE)) return;
  const rec = JSON.parse(fs.readFileSync(DRAW_FILE, 'utf8'));
  rec.sent = { ...(rec.sent || {}), [which]: new Date().toISOString() };
  fs.writeFileSync(DRAW_FILE, JSON.stringify(rec, null, 2));
}

// Resend stores the streak in first_name and the entry tag in last_name, so
// there is no real name anywhere. Best available is the email local part.
function _unusedDisplayName(email) {
  const local = String(email).split('@')[0].replace(/[._+-]+/g, ' ').trim();
  return local.split(' ')[0].replace(/^./, (c) => c.toUpperCase()) || 'you';
}

async function sendOne(to, subject, html, text, tag) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to, reply_to: 'hello@90books.com', subject, html, text,
        headers: {
          'List-Unsubscribe': UNSUB,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [{ name: 'type', value: tag }],
      }),
    });
    if (r.ok) return true;
    console.error(`  ${to}: ${r.status} ${await r.text()}`);
    return false;
  } catch (err) {
    console.error(`  ${to}: ${err}`);
    return false;
  }
}

function writePreviews({ winnerName, entries }) {
  const dir = path.join(REPO, '.giveaway-preview');
  fs.mkdirSync(dir, { recursive: true });
  const w = EMAILS.winnerEmail({ ga: GA, winnerName });
  const l = EMAILS.listEmail({ ga: GA, winnerName, entries, amzTag: AMZ_TAG });
  const files = [
    [path.join(dir, 'winner.html'), w.html, w.subject],
    [path.join(dir, 'list.html'), l.html, l.subject],
  ];
  for (const [f, html, subject] of files) {
    fs.writeFileSync(f, html);
    console.log(`  subject: ${subject}`);
  }
  return files.map(([f]) => f);
}

// ---------------------------------------------------------------- util

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function fail(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Create a Resend Broadcast as a DRAFT. Does not send.
 *
 * Why broadcasts and not the daily reminder: the reminder's HTML is generated in
 * `api/booky-send.js` at send time by a Vercel cron, so an announcement there is
 * a code change you cannot see the result of until ~140 people already have it.
 * On 2026-08-07 exactly that failed silently (see the warning in booky-send.js).
 * A broadcast is composed up front and visible in the dashboard before it sends.
 *
 * Usage — the key stays in your shell, it is never written to disk:
 *
 *   RESEND_API_KEY=re_xxx node scripts/create-broadcast.mjs
 *
 * Then open the dashboard link it prints, send yourself a test, and hit send.
 * Sending is deliberately left as a human click: this reaches every subscriber
 * and is not undoable.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.RESEND_API_KEY;
// Same audience the daily reminder sends to (RESEND_AUDIENCE_ID in Vercel).
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const FROM = process.env.RESEND_FROM || 'Booky <booky@90books.com>';

if (!API_KEY) {
  console.error('Missing RESEND_API_KEY.\n  RESEND_API_KEY=re_xxx RESEND_AUDIENCE_ID=... node scripts/create-broadcast.mjs');
  process.exit(1);
}
if (!AUDIENCE_ID) {
  console.error('Missing RESEND_AUDIENCE_ID (find it at resend.com/audiences).');
  process.exit(1);
}

const html = readFileSync(join(HERE, 'broadcast-word-list.html'), 'utf8');

if (!html.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')) {
  console.error('Refusing to create: the HTML has no unsubscribe token.');
  process.exit(1);
}

const res = await fetch('https://api.resend.com/broadcasts', {
  method: 'POST',
  headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audience_id: AUDIENCE_ID,
    from: FROM,
    name: 'Word list expanded (10k to 18,483)',
    subject: 'You asked for a bigger word list',
    preview_text: 'GAMES, TALKS and TEARS all work now.',
    html,
  }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Resend rejected it (${res.status}):`, JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log('Draft broadcast created. NOTHING HAS BEEN SENT.');
console.log('  id:', body.id);
console.log('  open: https://resend.com/broadcasts/' + body.id);
console.log('\nBefore sending: send yourself a test from that page, then click Send.');

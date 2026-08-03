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

  const winnerName = displayName(winner.email);
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
    const { subject, html, text } = winnerEmail({ winnerName });
    const ok = await sendOne(winner.email, subject, html, text, 'giveaway-winner');
    console.log(ok ? `Sent winner email to ${winner.email}` : `FAILED to send to ${winner.email}`);
    if (ok) markSent('winner');
    return;
  }

  const { subject, html, text } = listEmail({ winnerName, entries: entrants.length });
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
function displayName(email) {
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

// ---------------------------------------------------------------- copy
// No em-dashes anywhere in reader-facing copy (house rule).

function winnerEmail({ winnerName }) {
  const subject = `YOU WON!! 🎉`;
  const claimBy = new Date(Date.now() + CLAIM_DAYS * 864e5)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const body = [
    `${winnerName} YOU WON!! 🎉`,
    `Okay so I put every single entry in and pulled one at random and it was YOURS. You're getting a hardcover of <b>${GA.title}</b>, which (perfect timing honestly) comes out TODAY 😭`,
    `So the boring bit: just hit reply with your name, address and country and I'll order it from your local Amazon so it actually turns up fast instead of sitting in customs for three weeks. That's it, that's the whole thing.`,
    `One thing I feel a bit weird saying but I have to: if I don't hear back from you by <b>${claimBy}</b> I'll have to draw someone else 😬 Genuinely NOT rushing you, I just don't want the book sitting in limbo while someone else could have it.`,
    `Anyway CONGRATS 🎉 and thank you for playing, it honestly means a lot that people entered at all 💜`,
    `Olga`,
  ];
  return {
    subject,
    html: shell({
      eyebrow: 'You won',
      body,
      cta: { label: `Play today's Booky →`, url: PLAYURL },
      cover: GA.cover,
      coverTitle: 'Yours, out today',
      // Right after the "you won" beat, so they see the actual book early.
      coverAfter: 1,
      // No buy button and no affiliate link: theirs is already paid for.
      cardButton: false,
    }),
    text: plain(body, PLAYURL),
  };
}

function listEmail({ winnerName, entries }) {
  const subject = `We have a WINNER 🎉 (and the book's out today)`;
  const body = [
    `Okay, the first Booky giveaway has a WINNER 🎉`,
    `I pulled one entry at random and it was <b>${winnerName}</b>, so they're getting a hardcover of <b>${GA.title}</b> by ${GA.author}, which (perfect timing honestly) comes out today. Congrats to them, genuinely 💜`,
    `${entries} of you entered which is honestly WAY more than I expected for a first go at this?? I was fully prepared for like six people to turn up. So thank you 🙏`,
    `And if you missed it, it's Crowns of Nyaxia book #5 and the first of a brand new duet, following two new MCs, Kyrene and Septimus, that I can't wait to read about (especially the hot scene that Carissa nicely shared in her newsletter, iykyk 😜). Out today in hardcover, and it's on KINDLE UNLIMITED too 👀`,
    `If you grab it through the link up there, Amazon kicks a few cents back to me at no extra cost to you, and that's genuinely the entire budget behind these giveaways 😅 No pressure either way!!`,
    `This giveaway was a total success so there'll be MORE, the next one kicks off later in August, keep an eye out 👀 And keep that streak warm.`,
    `Olga`,
  ];
  return {
    subject,
    html: shell({
      eyebrow: 'Giveaway result',
      body,
      cta: { label: `Play today's Booky →`, url: PLAYURL },
      cover: GA.cover,
      coverTitle: `Out today, ${GA.announce}`,
      // Directly above the "And if you missed it" paragraph, so the cover and
      // the buy button sit right next to the pitch for the book.
      coverAfter: 2,
      cardButton: true,
      disclosure: true,
    }),
    text: plain(body, `Get it on Amazon: ${BUYURL}\n\nPlay today's Booky: ${PLAYURL}`),
  };
}

function plain(body, url) {
  return body.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n') +
    `\n\n${url}\n\n---\nBooky by 90books · you signed up at 90books.com/booky · reply to unsubscribe`;
}

// Same card look as api/booky-send.js and the entry confirmation, so this
// reads as the same sender. Tables, not flex, because of Outlook.
function shell({ eyebrow, body, cta, secondary, cover, coverTitle, coverAfter, cardButton, disclosure }) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Mirrors the win-screen book card in booky/app.js: cover and title both link
  // to the Amazon buy URL, with "Get it on Amazon →" as the secondary text link.
  // Vertical card: large cover on top, then title, author, date and (on the
  // announcement only) the buy button. A big cover is the selling point on a
  // phone. The winner's copy is already paid for, so their card has no button
  // and the cover is not a sponsored link.
  const linkOpen  = cardButton ? `<a href="${esc(BUYURL)}" rel="noopener sponsored" style="text-decoration:none;color:#2a0a26">` : '';
  const linkClose = cardButton ? '</a>' : '';
  const coverBlock = cover ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf6e9;border:1px solid #e8d4a8;border-radius:10px;margin:0 0 20px;">
            <tr><td align="center" style="padding:24px 20px;">
              ${linkOpen}<img src="${esc(cover)}" width="180" alt="${esc(GA.title)}" style="display:block;width:180px;max-width:70%;height:auto;border-radius:6px;border:0;margin:0 auto;" />${linkClose}
              ${linkOpen}<div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:600;color:#2a0a26;line-height:1.2;margin-top:18px;">${esc(GA.title)}</div>${linkClose}
              <div style="font-size:14px;color:#6a4a6c;margin-top:5px;">${esc(GA.author)}</div>
              ${coverTitle ? `<div style="font-size:12px;color:#96700c;margin-top:8px;font-weight:600;letter-spacing:0.3px;">${esc(coverTitle)}</div>` : ''}
              ${cardButton ? `<a href="${esc(BUYURL)}" rel="noopener sponsored" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#c8398f,#9a2670);background-color:#c8398f;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 26px;border-radius:10px;font-size:15px;white-space:nowrap;">Get it on Amazon &rarr;</a>` : ''}
            </td></tr>
          </table>` : '';
  const at = Number.isInteger(coverAfter) ? coverAfter : body.length - 1;
  const paras = body.map((p, i) =>
    `<p style="margin:0 0 ${i === body.length - 1 ? '24' : '16'}px;font-size:${i === 0 ? '18px;font-weight:600;color:#2a0a26' : '15px;color:#4a2a4c'};line-height:1.6;">${p}</p>` +
    (cover && i === at ? coverBlock : '')
  ).join('\n          ');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(eyebrow)}</title></head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 28px;">
        <tr><td>
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#c8398f;margin:0 0 4px;letter-spacing:0.5px;">Booky</p>
          <p style="margin:0 0 24px;color:#a587a9;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">${esc(eyebrow)}</p>
          ${paras}
          <a href="${esc(cta.url)}"${cta.sponsored ? ' rel="noopener sponsored"' : ''} style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);background-color:#c8398f;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px;">${esc(cta.label)}</a>
          ${secondary ? `<p style="margin:18px 0 0;font-size:14px;"><a href="${esc(secondary.url)}" style="color:#c8398f;text-decoration:none;font-weight:600;">${esc(secondary.label)}</a></p>` : ''}
          <hr style="border:none;border-top:1px solid #ead4e2;margin:28px 0 18px;">
          <p style="margin:0;font-size:11px;color:#a587a9;line-height:1.6;">
            ${disclosure ? 'The book link is an Amazon affiliate link, so a purchase may earn me a few cents at no cost to you.<br>' : ''}
            Booky by 90books &middot; you signed up at 90books.com/booky.<br>
            <a href="mailto:hello@90books.com?subject=unsubscribe" style="color:#a587a9;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function writePreviews({ winnerName, entries }) {
  const dir = path.join(REPO, '.giveaway-preview');
  fs.mkdirSync(dir, { recursive: true });
  const w = winnerEmail({ winnerName });
  const l = listEmail({ winnerName, entries });
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

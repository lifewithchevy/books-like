// api/booky-giveaway.js — draw the giveaway winner and send the result emails.
//
// WHY THIS RUNS ON THE SERVER: RESEND_API_KEY / RESEND_AUDIENCE_ID are marked
// Sensitive in Vercel, so `vercel env pull` returns them empty and nothing
// local can talk to Resend. Here they are just there, and the key never has to
// be copied anywhere.
//
// Auth: header `x-giveaway-key: ${GIVEAWAY_ADMIN_KEY}`. Without that env var
// set the route refuses every request, so a missing secret fails closed.
//
// Actions (?action=):
//   status       read-only. entrant count, whether a winner exists. Default.
//   draw         pick the winner and record it. Idempotent.
//   redraw       previous winner never claimed. Excludes everyone already drawn.
//
// The draw is WEIGHTED by games played: one ticket per game, floor of one, so
// everyone can win but the regulars are likelier to. Add `&weighted=no` for a
// flat draw. See the comment at the selection itself for why.
//   send-winner  email the winner.
//   send-list    email every other active subscriber.
//
// Sends need `&confirm=yes` on top of the key. Two locks, because the mistake
// this guards against (a stray request emailing the whole list) is not undoable.
//
// WHERE THE WINNER IS STORED: on the Resend contact itself. `last_name` is the
// entry tag (written by api/booky-subscribe.js); the winner's becomes
// `${tag}#WON` and, once emailed, `${tag}#SENT`. Serverless has no disk, so the
// contact record IS the receipt. A second draw finds the existing winner and
// returns it rather than rolling again.

const { winnerEmail, winnerEmailPlain, listEmail, displayName } = require('../lib/giveaway-emails');
const { streakOf, decodeStats } = require('./_stats-codec');

const WON_SUFFIX  = '#WON';
const SENT_SUFFIX = '#SENT';

module.exports = async (req, res) => {
  const ADMIN = process.env.GIVEAWAY_ADMIN_KEY;
  if (!ADMIN || req.headers['x-giveaway-key'] !== ADMIN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const KEY         = process.env.RESEND_API_KEY;
  const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
  // Player-facing mail is always Booky <booky@90books.com>. See api/booky-subscribe.js.
  const FROM        = 'Booky <booky@90books.com>';
  if (!KEY || !AUDIENCE_ID) {
    res.status(500).json({ error: 'resend-not-configured' });
    return;
  }

  const url     = new URL(req.url, 'https://90books.com');
  const action  = url.searchParams.get('action') || 'status';
  const tag     = url.searchParams.get('tag') || 'giveaway-nyaxia';
  const confirm = url.searchParams.get('confirm') === 'yes';
  const amzTag  = process.env.AMZ_TAG || '90books-20';

  // Giveaway metadata comes from the same payload the live win screen reads, so
  // the email can never describe a different book than the card did.
  let ga;
  try {
    const wr = await fetch('https://90books.com/api/booky-words');
    const words = await wr.json();
    const list = Array.isArray(words.giveaway) ? words.giveaway : [words.giveaway].filter(Boolean);
    ga = list.find((g) => g && g.tag === tag);
  } catch (err) {
    res.status(502).json({ error: 'could-not-read-giveaway', detail: String(err) });
    return;
  }
  if (!ga) { res.status(404).json({ error: 'no-such-giveaway', tag }); return; }

  // ---- contacts ----
  let contacts;
  try {
    const r = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) { res.status(502).json({ error: 'contacts-fetch-failed', status: r.status }); return; }
    contacts = ((await r.json()).data || []);
  } catch (err) {
    res.status(502).json({ error: 'contacts-fetch-exception', detail: String(err) });
    return;
  }

  const active   = contacts.filter((c) => !c.unsubscribed);
  const marker   = (c) => String(c.last_name || '');
  // An entrant is anyone whose tag starts with this giveaway's tag, so the
  // winner (tag#WON) still counts as an entrant and the totals stay honest.
  const entrants = active.filter((c) => marker(c) === tag || marker(c).startsWith(tag + '#'));
  const existing = active.find((c) => marker(c).startsWith(tag + '#'));

  const summary = {
    giveaway: { tag, title: ga.title, author: ga.author, window: `${ga.start}..${ga.end}` },
    contacts: contacts.length,
    active: active.length,
    entrants: entrants.length,
    winner: existing ? { email: existing.email, state: marker(existing).split('#')[1] } : null,
  };

  if (action === 'status') { res.status(200).json({ ok: true, ...summary }); return; }

  // Everything held on one contact. Useful before emailing a winner, and it
  // makes plain how little is actually stored: no name, no address, no country.
  if (action === 'contact') {
    const email = (url.searchParams.get('email') || '').toLowerCase();
    const c = contacts.find((x) => String(x.email).toLowerCase() === email);
    if (!c) { res.status(404).json({ error: 'no-such-contact', email }); return; }
    res.status(200).json({
      ok: true,
      email: c.email,
      created_at: c.created_at,
      unsubscribed: c.unsubscribed,
      streak_at_signup: streakOf(c.first_name),  // first_name packs the stats block
      entry_marker: c.last_name || null,        // last_name holds the giveaway tag
      display_name_used_in_email: displayName(c.email),
      raw: c,
    });
    return;
  }

  // ---- draw / redraw ----
  if (action === 'draw' || action === 'redraw') {
    if (entrants.length === 0) {
      res.status(409).json({ error: 'no-entrants', hint: 'nothing to draw, do not announce', ...summary });
      return;
    }
    if (existing && action === 'draw') {
      // Already drawn. Never roll twice.
      res.status(200).json({ ok: true, redrawn: false, ...summary });
      return;
    }
    // Redraw excludes everyone already picked; their marker keeps a #PASSED
    // note so the history survives.
    let pool = entrants;
    if (action === 'redraw') {
      if (!existing) { res.status(409).json({ error: 'nothing-to-redraw', ...summary }); return; }
      await patchContact(KEY, AUDIENCE_ID, existing.email, { last_name: `${tag}#PASSED` });
      pool = entrants.filter((c) => !marker(c).startsWith(tag + '#'));
      if (pool.length === 0) { res.status(409).json({ error: 'pool-exhausted', ...summary }); return; }
    }
    // crypto.randomInt, not Math.random: unbiased and not seedable, so the draw
    // is defensible if a reader ever asks how the winner was picked.
    const crypto = require('crypto');

    // WEIGHTED BY GAMES PLAYED. One ticket per game, minimum one ticket, so a
    // player who entered on their first day can still win and a player on their
    // 92nd game is 92x likelier. Flat was defensible but it wasted the thing
    // that makes this list worth having: on the Knave draw 44% of entrants had
    // played twice or fewer, and they carried the same odds as the regulars.
    //
    // `&weighted=no` restores the flat draw. It stays reachable because
    // weighting is an editorial choice about what a giveaway is FOR, and a
    // future giveaway aimed at new players wants the opposite.
    const weighted = url.searchParams.get('weighted') !== 'no';
    const ticketsFor = (c) => {
      const played = decodeStats(c.first_name).played;
      // played is null on a legacy contact that only ever stored a bare streak.
      // Those get the floor rather than zero — a missing record is not evidence
      // that someone never played, and nobody should be silently unwinnable.
      return played != null && played > 0 ? played : 1;
    };

    let pick;
    let tickets = null;
    let totalTickets = null;
    if (weighted) {
      totalTickets = pool.reduce((sum, c) => sum + ticketsFor(c), 0);
      // Walk the cumulative weights. randomInt(total) is always < total and
      // every entrant holds at least one ticket, so a winner is always found;
      // the fallback exists so a future change to ticketsFor can never return
      // undefined and record a winner of "undefined".
      let roll = crypto.randomInt(totalTickets);
      for (const c of pool) {
        roll -= ticketsFor(c);
        if (roll < 0) { pick = c; break; }
      }
      if (!pick) pick = pool[pool.length - 1];
      tickets = ticketsFor(pick);
    } else {
      pick = pool[crypto.randomInt(pool.length)];
    }
    const ok = await patchContact(KEY, AUDIENCE_ID, pick.email, { last_name: `${tag}${WON_SUFFIX}` });
    if (!ok) { res.status(502).json({ error: 'could-not-record-winner', email: pick.email }); return; }
    res.status(200).json({
      ok: true, drawn: true, redrawn: action === 'redraw',
      method: weighted ? 'weighted-by-games-played' : 'flat',
      winner: {
        email: pick.email,
        name: displayName(pick.email),
        // Shown so the draw can be explained afterwards rather than asserted.
        ...(weighted ? {
          gamesPlayed: decodeStats(pick.first_name).played,
          tickets,
          oddsPercent: Math.round((tickets / totalTickets) * 1000) / 10,
        } : {}),
      },
      entrants: entrants.length,
      ...(weighted ? { totalTickets } : {}),
    });
    return;
  }

  // Record that the winner was contacted WITHOUT sending anything. Giveaway #1
  // was emailed by hand from Gmail, because Gmail files everything from this
  // domain under Promotions and a winner should not have to dig for it. Without
  // this, the contact stays #WON and a later send-winner would email her twice.
  if (action === 'mark-sent') {
    if (!existing) { res.status(409).json({ error: 'no-winner-drawn' }); return; }
    const ok = await patchContact(KEY, AUDIENCE_ID, existing.email, { last_name: `${tag}${SENT_SUFFIX}` });
    res.status(ok ? 200 : 502).json({ ok, winner: existing.email, state: ok ? 'SENT' : 'unchanged' });
    return;
  }

  // ---- test send ----
  // Sends a real copy of either email to one address, so the reply path can be
  // tested end to end before a reader ever gets one. Never touches the winner
  // record, so a test cannot mark the giveaway as sent.
  if (action === 'send-test') {
    const to = (url.searchParams.get('to') || '').trim();
    const which = url.searchParams.get('which') || 'winner';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      res.status(400).json({ error: 'bad-to-address' });
      return;
    }
    const name = url.searchParams.get('name') || 'Kristen';
    const fancy = url.searchParams.get('style') === 'card';
    const mail = which === 'list'
      ? listEmail({ ga, winnerName: name, entries: entrants.length, amzTag })
      : (fancy ? winnerEmail({ ga, winnerName: name })
               : winnerEmailPlain({ ga, winnerName: name }));
    const personal = which !== 'list' && !fancy;
    const sent = await sendOne(KEY, FROM, to, mail, 'giveaway-test', personal);
    res.status(sent ? 200 : 502).json({ ok: sent, which, sent_to: to, subject: mail.subject });
    return;
  }

  // ---- sends ----
  if (action === 'send-winner' || action === 'send-list') {
    if (!confirm) { res.status(400).json({ error: 'needs-confirm', hint: 'add &confirm=yes' }); return; }
    if (!existing) { res.status(409).json({ error: 'no-winner-drawn', hint: 'run ?action=draw first' }); return; }

    // displayName() only splits the local part on . _ + -, so an address with
    // no separator comes back whole: emilyrsilva14@gmail.com renders as
    // "Emilyrsilva14". That is ugly in a mail to one person and a small privacy
    // leak in a mail to 78, since a gmail handle reconstructs the address.
    // `?winnerName=` lets the real name be passed once it is known, usually
    // from the winner's own reply.
    const winnerName = (url.searchParams.get('winnerName') || '').trim().slice(0, 40)
      || displayName(existing.email);

    if (action === 'send-winner') {
      if (marker(existing).endsWith(SENT_SUFFIX)) {
        res.status(200).json({ ok: true, already_sent: true, winner: existing.email });
        return;
      }
      const mail = winnerEmailPlain({ ga, winnerName });
      const sent = await sendOne(KEY, FROM, existing.email, mail, 'giveaway-winner', true);
      if (sent) await patchContact(KEY, AUDIENCE_ID, existing.email, { last_name: `${tag}${SENT_SUFFIX}` });
      res.status(sent ? 200 : 502).json({ ok: sent, sent_to: existing.email });
      return;
    }

    // Who gets the result mail. `all` (the default, and what giveaway 1 did)
    // is everyone active: release day is the commercial moment and it is what
    // makes non-entrants enter the next one. `entrants` is the narrower send,
    // for when the whole list is not the right audience — during the Microsoft
    // deliverability block, for instance, where every extra recipient is
    // another chance to bounce.
    const entrantsOnly = url.searchParams.get('audience') === 'entrants';
    const mail = listEmail({ ga, winnerName, entries: entrants.length, amzTag });
    const audience = (entrantsOnly ? entrants : active)
      .filter((c) => c.email !== existing.email);

    // Count first, send second. `dry=1` reports exactly who would be mailed
    // without sending, because "how many people is this about to hit" is the
    // one thing you want to be sure of before a send you cannot recall.
    if (url.searchParams.get('dry') === '1') {
      res.status(200).json({
        ok: true, dryRun: true,
        audience: entrantsOnly ? 'entrants' : 'all',
        wouldSend: audience.length,
        winnerName,
        subject: mail.subject,
        recipients: audience.map((c) => c.email),
      });
      return;
    }

    let sent = 0, failed = 0;
    for (const c of audience) {
      const ok = await sendOne(KEY, FROM, c.email, mail, 'giveaway-result');
      ok ? sent++ : failed++;
      await new Promise((r) => setTimeout(r, 600)); // Resend allows 2/s, stay under
    }
    res.status(200).json({
      ok: true, sent, failed,
      audience: audience.length,
      audienceKind: entrantsOnly ? 'entrants' : 'all',
    });
    return;
  }

  res.status(400).json({ error: 'unknown-action', action });
};

async function patchContact(key, audienceId, email, fields) {
  try {
    const r = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      }
    );
    if (!r.ok) console.error('[booky-giveaway] PATCH failed', email, r.status, await r.text());
    return r.ok;
  } catch (err) {
    console.error('[booky-giveaway] PATCH exception', email, err);
    return false;
  }
}

// `personal` sends a one-to-one email the way a person would: no
// List-Unsubscribe (a bulk-mail signal, and not required for a single
// non-marketing message) and no click tracking, so links are not rewritten
// through links.90books.com. Both are strong Gmail Promotions signals.
async function sendOne(key, from, to, mail, typeTag, personal = false) {
  try {
    const body = {
      // Player-facing: replies go to booky@ (see api/booky-subscribe.js).
      from, to, reply_to: 'booky@90books.com',
      subject: mail.subject, html: mail.html, text: mail.text,
      tags: [{ name: 'type', value: typeTag }],
    };
    if (personal) {
      body.track_click = false;
      body.track_opens = false;
    } else {
      body.headers = {
        'List-Unsubscribe': '<mailto:booky@90books.com?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error('[booky-giveaway] send failed', to, r.status, await r.text());
    return r.ok;
  } catch (err) {
    console.error('[booky-giveaway] send exception', to, err);
    return false;
  }
}

// send-list emails the whole audience one at a time, paced under Resend's
// 2/sec limit, so ~140 recipients takes ~85s. The default function timeout is
// shorter than that and would kill the run half way, leaving some readers
// emailed and no record of who got one. Set AFTER the handler assignment above,
// which would otherwise overwrite it. Declared here rather than in vercel.json,
// which the other session owns.
module.exports.config = { maxDuration: 300 };

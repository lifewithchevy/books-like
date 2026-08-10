// api/booky-update-streak.js — updates a subscriber's streak in Resend after each game.
// Called by app.js (fire-and-forget) whenever a game ends for a subscribed user.
//
// Env vars:
//   RESEND_API_KEY      — sk_xxx
//   RESEND_AUDIENCE_ID  — uuid

const { enforce } = require('./_rate-limit');
const { encodeStats } = require('./_stats-codec');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Unauthenticated POST that spends a real resource. Fails open.
  if (await enforce(req, res, { name: 'streak', limit: 60 })) return;

  const { email, streak, stats } = req.body || {};

  if (!email || typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanStreak = Number.isFinite(Number(streak)) ? Math.max(0, Number(streak)) : 0;

  // Store the whole stats block, not just the streak. A bare streak cannot be
  // restored onto a wiped device with any confidence: without lastPlayedDay we
  // cannot tell a live 30-day streak from one that died three weeks ago. The
  // packed value still starts with the streak, so every existing reader of this
  // field keeps working — see api/_stats-codec.js.
  const packed = encodeStats({
    currentStreak: cleanStreak,
    maxStreak: stats?.maxStreak,
    played: stats?.played,
    wins: stats?.wins,
    lastPlayedDay: stats?.lastPlayedDay,
  });

  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    res.status(200).json({ ok: true, stored: 'skipped-no-resend' });
    return;
  }

  try {
    // PATCH, not POST. This fires on every completed game for every
    // subscriber, so it is the most frequent write to a contact — and a POST
    // body without `last_name` risks clearing it. `last_name` holds the
    // giveaway entry tag, so clobbering it would silently drop entrants from
    // the draw. PATCH is a partial update: it touches first_name and nothing
    // else. (It also actually updates the streak on existing contacts, which
    // a POST returning 422 may never have done.)
    let r = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(cleanEmail)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_name: packed }),
      }
    );

    // Contact doesn't exist yet (e.g. localStorage says subscribed but the
    // contact was removed) — fall back to creating it.
    if (r.status === 404) {
      r = await fetch(
        `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            unsubscribed: false,
            first_name: packed,
          }),
        }
      );
    }

    // Report what actually happened to the record, not just that we survived.
    // This used to answer `ok: true` for every outcome including the 422 below,
    // where the PATCH 404'd and the create then hit an existing contact — so
    // nothing was written and the response said success anyway. That made it
    // impossible to tell a stored streak from a silently dropped one, which is
    // exactly the question restore-on-subscribe depends on.
    if (r.ok) {
      res.status(200).json({ ok: true, streak: cleanStreak, stored: 'resend' });
      return;
    }
    if (r.status === 422) {
      console.error('[booky-update-streak] NOT STORED — contact exists but PATCH 404d', cleanEmail);
      res.status(200).json({ ok: true, streak: cleanStreak, stored: 'not-stored-422' });
      return;
    }

    const txt = await r.text();
    console.error('[booky-update-streak] Resend error', r.status, txt);
    res.status(200).json({ ok: true, stored: 'resend-error' }); // never fail the client
  } catch (err) {
    console.error('[booky-update-streak] exception:', err);
    res.status(200).json({ ok: true, stored: 'exception' });
  }
};

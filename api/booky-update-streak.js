// api/booky-update-streak.js — updates a subscriber's streak in Resend after each game.
// Called by app.js (fire-and-forget) whenever a game ends for a subscribed user.
//
// Env vars:
//   RESEND_API_KEY      — sk_xxx
//   RESEND_AUDIENCE_ID  — uuid

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, streak } = req.body || {};

  if (!email || typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanStreak = Number.isFinite(Number(streak)) ? Math.max(0, Number(streak)) : 0;

  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    res.status(200).json({ ok: true, stored: 'skipped-no-resend' });
    return;
  }

  try {
    // Upsert the contact — POST with same email updates existing record
    const r = await fetch(
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
          first_name: String(cleanStreak),
        }),
      }
    );

    // 422 = contact already exists and was updated
    if (r.ok || r.status === 422) {
      res.status(200).json({ ok: true, streak: cleanStreak });
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

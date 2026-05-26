// api/booky-subscribe.js — collects email signups for Booky daily reminders.
// Storage: same Airtable base as feedback, separate table.
//
// Env vars (set in Vercel dashboard → Settings → Environment Variables):
//   AIRTABLE_API_KEY            — Personal Access Token (data:records:write)
//   AIRTABLE_BASE_ID            — e.g. appXXXXXXXXXXXXXX
//   AIRTABLE_BOOKY_TABLE        — table name, default "BookyReminders"
//
// Expected table fields (case-sensitive in Airtable):
//   Email          — single-line text
//   SignedUpAt     — date/datetime
//   Source         — single-line text (e.g. "win-screen")
//   CurrentStreak  — number (optional, just for context)
//   UserAgent      — single-line text (optional)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, source, streak } = req.body || {};

  // Basic email shape check (server-side; client also validates)
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE   = process.env.AIRTABLE_BOOKY_TABLE || 'BookyReminders';

  // Graceful degradation: if Airtable isn't wired up yet, succeed so the UI
  // doesn't break — we'll still see what's coming in via logs.
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[booky-subscribe] No Airtable configured — received:', {
      email: email.trim(),
      source: (source || 'unknown').trim(),
      streak: Number.isFinite(streak) ? streak : null,
    });
    res.status(200).json({ ok: true, stored: false });
    return;
  }

  try {
    const r = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // typecast lets Airtable coerce date strings into datetime fields,
          // and allows new option values for any single-select fields.
          typecast: true,
          records: [{
            fields: {
              Email: email.trim().toLowerCase(),
              SignedUpAt: new Date().toISOString(),
              Source: (source || 'unknown').slice(0, 60),
              CurrentStreak: Number.isFinite(streak) ? streak : null,
              UserAgent: (req.headers['user-agent'] || '').slice(0, 200),
            },
          }],
        }),
      }
    );

    if (!r.ok) {
      const txt = await r.text();
      console.error('[booky-subscribe] Airtable error:', r.status, txt);
      // Don't reveal Airtable internals to the client
      res.status(500).json({ error: 'Could not save signup' });
      return;
    }

    res.status(200).json({ ok: true, stored: true });
  } catch (err) {
    console.error('[booky-subscribe] Exception:', err);
    res.status(500).json({ error: 'Could not save signup' });
  }
};

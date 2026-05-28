// api/booky-subscribe.js — collects email signups for Booky daily reminders.
//
// Storage tiers (tried in order):
//   1. Resend audience       (preferred — built for email sending later)
//   2. Airtable BookyReminders (fallback if Resend env not set)
//   3. console.log + 200      (final fallback so UI never bounces)
//
// Env vars (set in Vercel dashboard → Settings → Environment Variables):
//   RESEND_API_KEY         — sk_xxx from resend.com/api-keys
//   RESEND_AUDIENCE_ID     — uuid from resend.com/audiences
//   AIRTABLE_API_KEY       — (legacy fallback) Personal Access Token
//   AIRTABLE_BASE_ID       — (legacy fallback) appXXXXXXXXXXXXXX
//   AIRTABLE_BOOKY_TABLE   — (legacy fallback) defaults to "BookyReminders"

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

  if (!email || typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const ctx = {
    source: (source || 'unknown').slice(0, 60),
    streak: Number.isFinite(streak) ? streak : null,
    ua: (req.headers['user-agent'] || '').slice(0, 200),
  };

  // ---- Tier 1: Resend audience ----
  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
  if (RESEND_API_KEY && RESEND_AUDIENCE_ID) {
    try {
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
            // first_name stores the streak count (internal field — never shown in emails)
            first_name: ctx.streak != null ? String(ctx.streak) : '0',
          }),
        }
      );

      // Resend returns 422 when the contact already exists — treat as success
      if (r.ok || r.status === 422) {
        // Send welcome email only for brand-new signups (r.ok), not re-subscribes (422)
        if (r.ok) {
          const RESEND_FROM = process.env.RESEND_FROM || 'Booky <booky@90books.com>';
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: RESEND_FROM,
                to: cleanEmail,
                subject: '✨ You\'re in — Booky will nudge you',
                text: "Tomorrow's word drops at midnight. Don't break your streak. — Booky 📚",
                html: "<p>Tomorrow's word drops at midnight. Don't break your streak.</p><p>— Booky 📚</p>",
              }),
            });
          } catch (err) {
            // Welcome email failure is non-fatal — contact is already saved
            console.error('[booky-subscribe] Welcome email failed:', err);
          }
        }
        res.status(200).json({ ok: true, stored: 'resend' });
        return;
      }

      const txt = await r.text();
      console.error('[booky-subscribe] Resend error', r.status, txt);
      // fall through to next tier
    } catch (err) {
      console.error('[booky-subscribe] Resend exception:', err);
      // fall through
    }
  }

  // ---- Tier 2: Airtable fallback ----
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE   = process.env.AIRTABLE_BOOKY_TABLE || 'BookyReminders';

  if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
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
            typecast: true,
            records: [{
              fields: {
                Email: cleanEmail,
                SignedUpAt: new Date().toISOString(),
                Source: ctx.source,
                CurrentStreak: ctx.streak,
                UserAgent: ctx.ua,
              },
            }],
          }),
        }
      );

      if (r.ok) {
        res.status(200).json({ ok: true, stored: 'airtable' });
        return;
      }
      const txt = await r.text();
      console.error('[booky-subscribe] Airtable error', r.status, txt);
      // fall through to logging
    } catch (err) {
      console.error('[booky-subscribe] Airtable exception:', err);
    }
  }

  // ---- Tier 3: log-only graceful degradation ----
  // Always succeed so the UI never shows an error — captures the signup in
  // Vercel function logs while storage is being set up.
  console.log('[booky-subscribe] No storage configured — captured signup:', {
    email: cleanEmail,
    ...ctx,
  });
  res.status(200).json({ ok: true, stored: 'log-only' });
};

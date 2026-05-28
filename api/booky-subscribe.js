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
                text: "Don't break your streak.\n\nA new word drops at midnight — we'll remind you before you forget.\n\nPlay now: https://90books.com/booky\n\n— Booky 📚",
                html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5eef8;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5eef8;">
<tr><td align="center" style="padding:32px 16px;">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background-color:#160516;border-radius:12px 12px 0 0;padding:28px 24px 20px;text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:600;color:#f2c4dc;letter-spacing:3px;">Booky</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;color:#9b6b8a;letter-spacing:2px;margin-top:4px;text-transform:uppercase;">The Daily Romantasy Word Game</div>
    </td>
  </tr>

  <!-- Tiles -->
  <tr>
    <td style="background-color:#1e0a1e;padding:20px 24px;text-align:center;">
      <table cellpadding="0" cellspacing="5" style="margin:0 auto;">
        <tr>
          <td style="width:46px;height:46px;background-color:#538d4e;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:46px;">F</td>
          <td style="width:46px;height:46px;background-color:#538d4e;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:46px;">A</td>
          <td style="width:46px;height:46px;background-color:#538d4e;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:46px;">T</td>
          <td style="width:46px;height:46px;background-color:#538d4e;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:46px;">E</td>
          <td style="width:46px;height:46px;background-color:#538d4e;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;line-height:46px;">D</td>
        </tr>
      </table>
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#7a4a6a;margin-top:12px;letter-spacing:0.5px;">fated mates await 🔥</div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background-color:#ffffff;padding:32px 40px;text-align:center;">
      <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;color:#160516;font-weight:600;line-height:1.3;">Don't break your streak.</p>
      <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:14px;color:#888888;line-height:1.7;">A new word drops at midnight.<br>We'll nudge you before you forget.</p>
      <a href="https://90books.com/booky" style="display:inline-block;background-color:#160516;color:#f2c4dc;text-decoration:none;padding:13px 36px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.5px;">Play tomorrow's word →</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color:#faf5fc;border-radius:0 0 12px 12px;padding:16px 40px;text-align:center;border-top:1px solid #edd5f0;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#bbbbbb;line-height:1.6;">You signed up for daily Booky reminders at 90books.com/booky</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`,
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

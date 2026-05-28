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
                subject: '✨ You\'re in, Booky will remind you',
                text: "Don't break your streak.\n\nA new word drops at midnight — we'll remind you before you forget.\n\nPlay Booky: https://90books.com/booky\n\n— Booky 📚",
                html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<style>
  /* Dark mode overrides — supported in Apple Mail, iOS Mail, Gmail iOS/Android */
  @media (prefers-color-scheme: dark) {
    .bky-wrap  { background-color: #160516 !important; }
    .bky-hdr   { background-color: #2d0a2d !important; }
    .bky-body  { background-color: #1f0a1f !important; }
    .bky-foot  { background-color: #2a082a !important; border-top-color: #4a1a4a !important; }
    .bky-h1    { color: #f5eef8 !important; }
    .bky-sub   { color: #ccaacc !important; }
    .bky-btn   { background-color: #9333d9 !important; color: #ffffff !important; }
    .bky-ftxt  { color: #886688 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5eef8;font-family:Georgia,serif;" class="bky-wrap">
<table width="100%" cellpadding="0" cellspacing="0" class="bky-wrap" style="background-color:#f5eef8;">
<tr><td align="center" style="padding:32px 16px;">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

  <!-- Header: BOOKY as purple correct tiles -->
  <tr>
    <td class="bky-hdr" style="background-color:#f0e4f8;border-radius:12px 12px 0 0;padding:32px 24px 28px;text-align:center;">
      <table cellpadding="0" cellspacing="6" style="margin:0 auto;">
        <tr>
          <td style="width:50px;height:50px;background-color:#9333d9;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;line-height:50px;">B</td>
          <td style="width:50px;height:50px;background-color:#9333d9;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;line-height:50px;">O</td>
          <td style="width:50px;height:50px;background-color:#9333d9;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;line-height:50px;">O</td>
          <td style="width:50px;height:50px;background-color:#9333d9;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;line-height:50px;">K</td>
          <td style="width:50px;height:50px;background-color:#9333d9;border-radius:5px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;line-height:50px;">Y</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td class="bky-body" style="background-color:#ffffff;padding:36px 40px;text-align:center;">
      <p class="bky-h1" style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;color:#160516;font-weight:600;line-height:1.3;">Don't break your streak.</p>
      <p class="bky-sub" style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:14px;color:#888888;line-height:1.7;">A new word drops at midnight.<br>We'll remind you before you forget.</p>
      <a href="https://90books.com/booky" class="bky-btn" style="display:inline-block;background-color:#160516;color:#f2c4dc;text-decoration:none;padding:13px 36px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.5px;">Play Booky</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="bky-foot" style="background-color:#faf5fc;border-radius:0 0 12px 12px;padding:16px 40px;text-align:center;border-top:1px solid #edd5f0;">
      <p class="bky-ftxt" style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#bbbbbb;line-height:1.6;">You signed up for daily Booky reminders at 90books.com/booky</p>
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

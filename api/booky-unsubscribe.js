// api/booky-unsubscribe.js — the destination of the footer link in Booky email.
//
// GET  → marks the contact unsubscribed in the Resend audience, shows a page.
// POST → same, no page (RFC 8058 one-click, called by Gmail/Apple Mail).
//
// The link is signed (see lib/unsubscribe.js), so `?e=someone@else.com` without
// a matching `t` does nothing.
//
// Unsubscribing sets `unsubscribed: true` on the contact rather than deleting
// it. api/booky-send.js already filters those out, and keeping the row means a
// re-subscribe still has the player's streak (packed into first_name).
//
// Env vars: RESEND_API_KEY, RESEND_AUDIENCE_ID (already set for booky-send).

const { verify, normalize } = require('../lib/unsubscribe');

module.exports = async (req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'POST' && method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const q = req.query || {};
  const email = normalize(q.e || q.email);
  const token = q.t || q.token;

  if (!email || !verify(email, token)) {
    // Same response whether the signature is wrong or the address is unknown —
    // this endpoint must not confirm whether an address is on the list.
    sendPage(res, 400, 'That link isn\'t valid', 'It may have been cut in half by your email app. Reply to any Booky email and we\'ll take you off the list by hand.');
    return;
  }

  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    console.error('[booky-unsubscribe] Resend env not configured');
    sendPage(res, 500, 'Something went wrong', 'Reply to any Booky email and we\'ll take you off the list by hand.');
    return;
  }

  try {
    const r = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unsubscribed: true }),
      }
    );

    // 404 = not in the audience. They are, as far as they're concerned,
    // unsubscribed — say so rather than showing an error.
    if (!r.ok && r.status !== 404) {
      const txt = await r.text();
      console.error('[booky-unsubscribe] PATCH failed', r.status, txt);
      sendPage(res, 500, 'Something went wrong', 'Reply to any Booky email and we\'ll take you off the list by hand.');
      return;
    }

    console.log('[booky-unsubscribe] ok', r.status);
  } catch (err) {
    console.error('[booky-unsubscribe] exception:', err);
    sendPage(res, 500, 'Something went wrong', 'Reply to any Booky email and we\'ll take you off the list by hand.');
    return;
  }

  if (method === 'POST') {
    res.status(200).json({ ok: true });
    return;
  }

  sendPage(
    res,
    200,
    'You\'re unsubscribed',
    'No more daily reminders. Booky is still there whenever you want it.'
  );
};

function sendPage(res, status, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · Booky</title>
</head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <div style="max-width:420px;margin:0 auto;padding:64px 20px;text-align:center;">
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:600;color:#c8398f;margin:0 0 20px;letter-spacing:0.5px;">Booky</p>
    <div style="background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 24px;">
      <p style="margin:0 0 10px;font-size:18px;font-weight:600;">${title}</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6a4a6c;">${body}</p>
      <a href="https://90books.com/booky?utm_source=unsubscribe&utm_medium=email&utm_campaign=daily_reminder" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px;">Play today's Booky</a>
    </div>
  </div>
</body>
</html>`);
}

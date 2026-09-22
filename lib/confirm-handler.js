// lib/confirm-handler.js — where the "confirm your email" link lands.
//
// GET → flips `unsubscribed: false` on the Resend contact, shows a page.
//
// ⚠️ Lives in lib/ and is dispatched from api/booky-subscribe.js (`?confirm=1`)
// rather than being its own api/ route. api/ is at Vercel's 12-Serverless-
// Function cap and a 13th file fails the entire build, so nothing deploys, not
// just the new route. Count before adding to api/. Same reason as
// lib/unsubscribe-handler.js.
//
// HOW PENDING IS STORED: as `unsubscribed: true`. Resend contacts expose only
// two writable string fields and both are spoken for — `first_name` packs the
// player's stats (api/_stats-codec.js) and `last_name` holds the giveaway entry
// tag, which the draw reads. There is nowhere to put a "confirmed?" flag, so we
// reuse the boolean Resend already has. It fits: api/booky-send.js already does
// `.filter(c => !c.unsubscribed)`, so a pending contact is skipped by the daily
// send for free, with no change to the send at all.
//
// The tradeoff is that "never confirmed" and "unsubscribed on purpose" look the
// same in the dashboard. That is acceptable: both mean do not email this person,
// which is the only thing the send needs to know.

const { verify, normalize } = require('./confirm');

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
    // Same reply whether the signature is wrong or the address is unknown, so
    // this endpoint cannot be used to test whether an address is on the list.
    sendPage(
      res, 400,
      'That link isn\'t valid',
      'It may have been cut in half by your email app. Try tapping it again from the email, or sign up once more on the win screen.'
    );
    return;
  }

  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    console.error('[booky-confirm] Resend env not configured');
    sendPage(res, 500, 'Something went wrong', 'Try the link again in a minute. If it still fails, reply to the email and I\'ll add you by hand.');
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
        body: JSON.stringify({
          unsubscribed: false,
          // Dashboard-visible only, see api/booky-subscribe.js. Flips the
          // signup-time 'pending' to 'confirmed' so a real subscriber no
          // longer reads as indistinguishable from an unsubscribe.
          properties: [{ key: 'status', value: 'confirmed' }],
        }),
      }
    );

    // 404 means the contact row is gone, so there is nothing to confirm. Tell
    // them to sign up again rather than showing a success page that did nothing.
    if (r.status === 404) {
      sendPage(
        res, 404,
        'We couldn\'t find that signup',
        'Play today\'s Booky and pop your email in on the win screen, it only takes a second.'
      );
      return;
    }

    if (!r.ok) {
      const txt = await r.text();
      console.error('[booky-confirm] PATCH failed', r.status, txt);
      if (q.debug) { res.status(500).json({ status: r.status, body: txt }); return; }
      sendPage(res, 500, 'Something went wrong', 'Try the link again in a minute. If it still fails, reply to the email and I\'ll add you by hand.');
      return;
    }

    console.log('[booky-confirm] ok', email);
  } catch (err) {
    console.error('[booky-confirm] exception:', err);
    if (q.debug) { res.status(500).json({ exception: String(err && err.stack || err) }); return; }
    sendPage(res, 500, 'Something went wrong', 'Try the link again in a minute. If it still fails, reply to the email and I\'ll add you by hand.');
    return;
  }

  if (method === 'POST') {
    res.status(200).json({ ok: true, confirmed: true });
    return;
  }

  // Confirming twice lands here too and is harmless: the PATCH is idempotent,
  // so a second tap just sets unsubscribed:false again and shows the same page.
  sendPage(
    res, 200,
    'You\'re in 🎉',
    'Your daily Booky reminder starts tomorrow. Your streak is safe from here.'
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
    <img src="https://90books.com/logo/booky-email.png" width="112" height="43" alt="Booky" style="display:block;margin:0 auto 20px;border:0;outline:none;text-decoration:none;">
    <div style="background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 24px;">
      <p style="margin:0 0 10px;font-size:18px;font-weight:600;">${title}</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6a4a6c;">${body}</p>
      <a href="https://90books.com/booky?utm_source=confirm&utm_medium=email&utm_campaign=double_optin" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px;">Play today's Booky</a>
    </div>
  </div>
</body>
</html>`);
}

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

// Looks up the giveaway named by `?g=` so the success page can say what was
// actually confirmed. Returns null for anything unexpected: a missing tag, a
// tag that matches nothing, a giveaway whose window has passed, or a words.json
// that cannot be read on this deployment. Confirming is the one step that must
// never fail, so every branch here degrades to the generic page instead of
// throwing. Windows are compared on the date string, which is safe because they
// are all plain YYYY-MM-DD and sort lexicographically.
// sendPage interpolates straight into HTML. Its own strings are static, but a
// book title comes from words.json and can carry an ampersand.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function liveGiveaway(tag) {
  if (!tag) return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const raw = fs.readFileSync(path.join(__dirname, '..', 'booky', 'words.json'), 'utf8');
    const list = JSON.parse(raw).giveaway;
    if (!Array.isArray(list)) return null;
    const today = new Date().toISOString().slice(0, 10);
    const g = list.find((x) => x && x.tag === tag);
    if (!g || !g.start || !g.end) return null;
    // A confirm often lands after the window shuts, and "you're entered" is
    // still true for a few days while the draw is pending. But an old link from
    // a finished giveaway must NOT render, or it promises a winner on a date
    // that has already passed. Seven days covers a late click and nothing more.
    const grace = new Date(`${g.end}T00:00:00Z`);
    grace.setUTCDate(grace.getUTCDate() + 7);
    return g.start <= today && today <= grace.toISOString().slice(0, 10) ? g : null;
  } catch (err) {
    console.error('[booky-confirm] giveaway lookup failed:', err);
    return null;
  }
}

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
          // `properties` is NOT a field Resend's Contacts API accepts, in any
          // shape (object or array) — both 422 with "expected record, received
          // array". It was added 2026-09-22 as a dashboard-only display hint
          // and instead broke every confirm click with a silent 500, so no
          // subscriber who clicked confirm ever actually got confirmed. There
          // is no working dashboard-visible pending/confirmed distinction
          // right now; `unsubscribed` is the only field that actually exists
          // and it alone is what api/booky-send.js filters on.
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
      sendPage(res, 500, 'Something went wrong', 'Try the link again in a minute. If it still fails, reply to the email and I\'ll add you by hand.');
      return;
    }

    console.log('[booky-confirm] ok', email);
  } catch (err) {
    console.error('[booky-confirm] exception:', err);
    sendPage(res, 500, 'Something went wrong', 'Try the link again in a minute. If it still fails, reply to the email and I\'ll add you by hand.');
    return;
  }

  if (method === 'POST') {
    res.status(200).json({ ok: true, confirmed: true });
    return;
  }

  // Confirming twice lands here too and is harmless: the PATCH is idempotent,
  // so a second tap just sets unsubscribed:false again and shows the same page.
  // Someone arriving from a giveaway email gets told about the entry as well as
  // the reminder, because the entry is the thing they actually came here for.
  const g = liveGiveaway(q.g);
  sendPage(
    res, 200,
    'You\'re in 🎉',
    g
      ? `You're entered to win ${esc(g.title || 'the book')}, and I'll announce the winner on ${esc(g.announce || 'the announce date')}. Your daily Booky reminder starts tomorrow.`
        // The win-screen card has no room for the prize terms, so this page
        // carries them. The card shows a book cover, so saying plainly that the
        // prize arrives as a gift card is the honest version, and framing it as
        // the reason it works anywhere keeps it from reading as a downgrade.
        + `<br><br><span style="font-size:13px;color:#8a6a8c;">Open worldwide. The winner gets a gift card for the book, so it works wherever you are.</span>`
      : 'Your daily Booky reminder starts tomorrow. Your streak is safe from here.'
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

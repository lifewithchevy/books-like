// lib/confirm.js — signed confirmation links for Booky's double opt-in.
//
// WHY THIS EXISTS: 90books.com was listed on the Spamhaus Domain Blocklist on
// 28 Aug 2026. Every message to Microsoft (hotmail/outlook/live) and GMX has
// bounced since — 559 bounces and a 14.55% bounce rate by 14 Sep, against
// Resend's 4% risk line. Resend support confirmed the cause is the DBL listing,
// not their IPs and not our DNS (SPF/DKIM/DMARC are all clean). Spamhaus's
// removal condition is that "COI is being observed", COI being Confirmed
// Opt-In. Booky was single opt-in: type an address on the win screen and you
// were subscribed instantly, with nothing checking the address belonged to you.
// That is how a typo becomes a spam trap hit.
//
// Deliberately a near-copy of lib/unsubscribe.js rather than a shared helper.
// The two links must NOT be interchangeable: the HMAC prefix differs
// (`confirm:` vs `unsub:`), so an unsubscribe token cannot confirm a contact
// and a confirm token cannot unsubscribe one. Sharing a sign() would quietly
// make them the same token.
//
// Secret: same chain as unsubscribe, so nothing new is needed in Vercel env.

const crypto = require('crypto');

const BASE = 'https://90books.com';

function secret() {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.RESEND_API_KEY ||
    ''
  );
}

function normalize(email) {
  return String(email || '').trim().toLowerCase();
}

function sign(email) {
  return crypto
    .createHmac('sha256', secret())
    .update(`confirm:${normalize(email)}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .slice(0, 16);
}

function verify(email, token) {
  const expected = sign(email);
  const got = String(token || '');
  if (!secret() || got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
}

// Rides on the subscribe route with `?confirm=1`, exactly as unsubscribe rides
// on it with `?unsub=1`. api/ sits at Vercel's 12-Serverless-Function cap and a
// 13th file fails the WHOLE deployment, not just the new route. Anything in
// lib/ is bundled into its caller and is free.
function confirmUrl(email) {
  const e = normalize(email);
  return `${BASE}/api/booky-subscribe?confirm=1&e=${encodeURIComponent(e)}&t=${sign(e)}`;
}

module.exports = { confirmUrl, sign, verify, normalize };

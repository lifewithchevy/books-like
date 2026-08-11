// lib/unsubscribe.js — signed one-click unsubscribe links for Booky email.
//
// Why this exists: the daily reminder (api/booky-send.js) used
// `{{{RESEND_UNSUBSCRIBE_URL}}}` in its footer. Resend only substitutes that
// variable for **Broadcasts**. The daily reminder is sent per-contact through
// POST /emails, where nothing substitutes it, so every subscriber received a
// footer whose href was the literal string `{{{RESEND_UNSUBSCRIBE_URL}}}` — a
// dead link. Verified on the deployed preview endpoint 2026-08-11.
//
// The link is signed rather than a bare `?email=`, so nobody can unsubscribe
// someone else by editing a URL.
//
// Secret: UNSUBSCRIBE_SECRET if set, else CRON_SECRET, else RESEND_API_KEY.
// The fallbacks are deliberate — they are already present in the Vercel env,
// so this works without Olga adding anything. Rotating RESEND_API_KEY (or
// CRON_SECRET) invalidates links in already-delivered mail; set
// UNSUBSCRIBE_SECRET to a random string if that ever matters.

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

// Base64url of an HMAC, truncated to 16 chars. Short enough to keep the URL
// tidy, long enough (96 bits) that guessing one is not a thing.
function sign(email) {
  return crypto
    .createHmac('sha256', secret())
    .update(`unsub:${normalize(email)}`)
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

// The link that goes in the footer of every email we send per-contact.
//
// It points at the SUBSCRIBE route with `?unsub=1`, which dispatches to
// lib/unsubscribe-handler.js. A standalone api/booky-unsubscribe.js would be a
// 13th Serverless Function and the Hobby plan allows 12 — that failed the whole
// deployment, not just the new route.
function unsubscribeUrl(email) {
  const e = normalize(email);
  return `${BASE}/api/booky-subscribe?unsub=1&e=${encodeURIComponent(e)}&t=${sign(e)}`;
}

// Headers that let Gmail/Apple Mail show their own "Unsubscribe" button and
// call the endpoint directly. One-click (RFC 8058) needs the POST header AND
// an endpoint that accepts POST without a confirmation step — booky-unsubscribe
// does. Sent alongside the visible footer link, not instead of it.
function unsubscribeHeaders(email) {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl(email)}>, <mailto:hello@90books.com?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

module.exports = { unsubscribeUrl, unsubscribeHeaders, sign, verify, normalize };

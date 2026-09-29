// lib/contact-status.js — the dashboard-visible `status` property.
//
// WHY: Resend has exactly two real states, subscribed and unsubscribed, and
// double opt-in needs three. "Never confirmed" was stored as
// `unsubscribed: true`, which made the Audience table read as if 20 readers had
// opted out when they had only failed to click a link. The custom contact
// property `status` (already created in the dashboard, fallback "unknown")
// carries the real answer: pending | confirmed | unsubscribed.
//
// ⚠️ ALWAYS ITS OWN PATCH, NEVER BUNDLED WITH `unsubscribed`.
// On 2026-09-22 `properties` was added to the same PATCH that sets
// `unsubscribed: true` — and in the ARRAY shape `[{key,value}]`, which Resend
// 422s ("expected record, received array"). Because the handler treats a failed
// PATCH as a failed unsubscribe, every footer unsubscribe click since then hit
// "Something went wrong" AND left the reader subscribed. The correct shape is a
// flat object, but the real lesson is the bundling: a cosmetic dashboard label
// must never be able to fail an action that matters. So this helper does its
// own request and swallows every error.

const STATUSES = new Set(['pending', 'confirmed', 'unsubscribed']);

async function setStatus(email, status) {
  if (!STATUSES.has(status)) return false;
  const key = process.env.RESEND_API_KEY;
  const aud = process.env.RESEND_AUDIENCE_ID;
  if (!key || !aud || !email) return false;
  try {
    const r = await fetch(
      `https://api.resend.com/audiences/${aud}/contacts/${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        // Flat object, per Resend's update-contact reference. Not an array.
        body: JSON.stringify({ properties: { status } }),
      }
    );
    if (!r.ok) {
      console.error('[contact-status] PATCH failed', r.status, await r.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[contact-status] threw:', err);
    return false;
  }
}

module.exports = { setStatus, STATUSES };

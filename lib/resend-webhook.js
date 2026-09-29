// lib/resend-webhook.js — which link did they click?
//
// WHY THIS EXISTS: Resend's dashboard only says "Clicked", never WHICH link.
// On 15 Sep a 57-day-streak player clicked something in the daily email and
// was unsubscribed the next day, and there was no way to prove it was the
// unsubscribe link. Resend's `email.clicked` webhook carries the exact URL, so
// every click now lands in PostHog as `email_link_clicked` with the link and
// what kind of link it was.
//
// Rides on api/booky-subscribe.js with `?webhook=resend` because api/ is at
// Vercel's 12-function cap (a 13th file fails the whole deploy).
//
// Authenticity without a signing secret: Resend secrets are Sensitive in
// Vercel and cannot be read back, so instead of verifying the Svix signature
// we fetch the email by id from Resend with our own API key and require the
// recipient to match. A forged event would need a real email id AND its real
// recipient, and the worst it can do is add one fake row to analytics.

const POSTHOG_KEY = 'phc_kGtxS8YTvuNDKihCv5h8bP4wJyW3cnpdeRaTeqo5wedr'; // public project key, same as the site
const POSTHOG_URL = 'https://us.i.posthog.com/capture/';

// Resend rewrites every tracked link through links.90books.com, but the
// webhook reports the ORIGINAL destination, so these patterns match what was
// actually written in the email. A links.90books.com URL arriving here would
// still be classified by its query string (unsub=1 / confirm=1 survive it).
function linkKind(url) {
  const u = String(url || '');
  // mailto FIRST: a mailto:booky@90books.com contains the domain and would
  // otherwise be classified as a site link.
  if (/^mailto:/i.test(u)) return 'mailto';
  if (/unsub=1|RESEND_UNSUBSCRIBE|\/unsubscribe/i.test(u)) return 'unsubscribe';
  if (/confirm=1/.test(u)) return 'confirm';
  if (/amazon\.|amzn\./i.test(u)) return 'buy';
  if (/90books\.com\/booky/i.test(u)) return 'play';
  if (/90books\.com/i.test(u)) return 'site';
  return 'other';
}

module.exports = async (req, res) => {
  const evt = req.body || {};
  // Acknowledge everything else so Resend does not retry it.
  if (evt.type !== 'email.clicked') { res.status(200).json({ ok: true, ignored: evt.type || null }); return; }

  const d = evt.data || {};
  const id = d.email_id;
  const link = d.click && d.click.link;
  const key = process.env.RESEND_API_KEY;
  if (!id || !link || !key) { res.status(400).json({ error: 'bad-event' }); return; }

  let email = null;
  try {
    const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.ok) email = await r.json();
  } catch (err) {
    console.error('[resend-webhook] email lookup threw:', err);
  }
  const to = [].concat((email && email.to) || []).map((x) => String(x).toLowerCase());
  const claimed = [].concat(d.to || []).map((x) => String(x).toLowerCase());
  if (!email || !claimed.length || !claimed.every((x) => to.includes(x))) {
    res.status(401).json({ error: 'unverified' });
    return;
  }

  const tags = Array.isArray(d.tags)
    ? Object.fromEntries(d.tags.map((t) => [t.name, t.value]))
    : (d.tags || {});
  try {
    await fetch(POSTHOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: 'email_link_clicked',
        distinct_id: to[0],
        timestamp: (d.click && d.click.timestamp) || evt.created_at,
        properties: {
          link,
          link_kind: linkKind(link),
          subject: d.subject || email.subject || null,
          email_type: tags.type || null,
          broadcast_id: d.broadcast_id || null,
          email_id: id,
          $process_person_profile: false,
        },
      }),
    });
  } catch (err) {
    console.error('[resend-webhook] posthog capture threw:', err);
  }
  res.status(200).json({ ok: true });
};

module.exports.linkKind = linkKind;

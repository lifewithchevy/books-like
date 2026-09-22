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

// Giveaway confirmation email. Matches the daily-reminder card design in
// api/booky-send.js so readers get used to seeing a book cover in Booky mail.
// Table layout (not flexbox) because Outlook doesn't do flex, and the title is
// live text rather than baked into the image because clients block images.
function buildGiveawayWelcomeHtml({ title, announce, playUrl, cover, unsubUrl }) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeTitle = esc(title);
  const coverCell = cover && /^https:\/\//.test(cover)
    ? `<td style="padding:12px;width:52px;vertical-align:middle">
             <img src="${esc(cover)}" width="52" height="78" alt="${safeTitle}" style="display:block;border-radius:4px;border:0" />
           </td>`
    : '';
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>You're entered</title></head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 28px;">
        <tr><td>
          <img src="https://90books.com/logo/booky-email.png" width="104" height="40" alt="Booky" style="display:block;margin:0 auto 4px;border:0;outline:none;text-decoration:none;">
          <p style="margin:0 0 24px;color:#a587a9;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">You're entered</p>
          <p style="margin:0 0 16px;font-size:18px;line-height:1.5;color:#2a0a26;font-weight:600;">You're entered. &#127873;</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf6e9;border:1px solid #e8d4a8;border-radius:10px;margin:0 0 18px;">
            <tr>
              ${coverCell}
              <td style="padding:12px 12px 12px ${coverCell ? '0' : '12px'};vertical-align:middle">
                <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;font-weight:600;color:#2a0a26;line-height:1.15;">${safeTitle}</div>
                <div style="font-size:11.5px;color:#96700c;margin-top:5px;font-weight:600;">Winner announced ${esc(announce)}</div>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#6a4a6c;">I'll pick one winner on ${esc(announce)} and announce it right here.<br><br>Until then, there's a new word every midnight. I'll remind you each evening so you don't lose your streak.</p>
          <a href="${esc(playUrl)}" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);background-color:#c8398f;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px;">Play today's Booky &rarr;</a>
          <hr style="border:none;border-top:1px solid #ead4e2;margin:28px 0 18px;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6a4a6c;">
            Know a reader who'd love this? Send them <a href="https://90books.com/booky?utm_source=giveaway_welcome&utm_medium=email&utm_campaign=friend_referral" style="color:#c8398f;text-decoration:none;">90books.com/booky</a>
          </p>
          <p style="margin:18px 0 0;font-size:11px;color:#a587a9;line-height:1.5;">
            Free to enter, no purchase necessary. One entry per reader, open worldwide, void where prohibited.<br>
            Booky by 90books &middot; you signed up at 90books.com/booky.<br>
            <a href="${esc(unsubUrl)}" style="color:#a587a9;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Double opt-in confirmation for someone who arrived through a GIVEAWAY.
// The generic confirmHtml below only talks about turning on a daily reminder,
// which is not what this reader just did: they entered to win a book. Being
// answered about something they did not ask for is how a confirmation goes
// unclicked, and an unclicked confirmation is a lost entrant, so the entry is
// what this email leads with. Same one-button shape as confirmHtml, same card
// as buildGiveawayWelcomeHtml, so it still looks like Booky mail.
function buildGiveawayConfirmHtml({ title, announce, cover, link }) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeTitle = esc(title);
  const coverCell = cover && /^https:\/\//.test(cover)
    ? `<td style="padding:12px;width:52px;vertical-align:middle">
             <img src="${esc(cover)}" width="52" height="78" alt="${safeTitle}" style="display:block;border-radius:4px;border:0" />
           </td>`
    : '';
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm your entry</title></head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;padding:40px 16px;">
    <tr><td align="center" style="text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 28px;">
        <tr><td>
          <img src="https://90books.com/logo/booky-email.png" width="104" height="40" alt="Booky" style="display:block;margin:0 auto 4px;border:0;outline:none;text-decoration:none;">
          <p style="margin:0 0 20px;color:#a587a9;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;text-align:center;">One more tap</p>
          <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#2a0a26;">Confirm your entry</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf6e9;border:1px solid #e8d4a8;border-radius:10px;margin:0 0 18px;text-align:left;">
            <tr>
              ${coverCell}
              <td style="padding:12px 12px 12px ${coverCell ? '0' : '12px'};vertical-align:middle">
                <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;font-weight:600;color:#2a0a26;line-height:1.15;">${safeTitle}</div>
                <div style="font-size:11.5px;color:#96700c;margin-top:5px;font-weight:600;">Winner announced ${esc(announce)}</div>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a2a4c;">Your entry isn't in yet. Tap below and you're counted, and I'll also send you the daily reminder each evening.</p>
          <p style="margin:0 0 24px;">
            <a href="${esc(link)}" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);background-color:#c8398f;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 30px;border-radius:10px;font-size:15px;">Yes, count me in</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#8a6a8c;">If you didn't enter, just ignore this. Nothing happens and you won't hear from me again.</p>
          <p style="margin:18px 0 0;font-size:11px;color:#a587a9;line-height:1.5;">Open worldwide. The winner gets a gift card for the book, so it works wherever you are.<br>Free to enter, no purchase necessary. Booky by 90books.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const { enforce } = require('./_rate-limit');
const { encodeStats, decodeStats } = require('./_stats-codec');
// Same signed one-click link the daily reminder uses (lib/unsubscribe.js).
// The giveaway welcome/confirmation mail below used to carry a mailto-only
// List-Unsubscribe, which Apple Mail's and Gmail's built-in Unsubscribe
// button turns into a plain email instead of a link — nothing processes it,
// so the subscriber stays on the list believing they left. Fixed 2026-09-22
// after a real report (Lisa, giveaway welcome mail, 19 Sep).
const { unsubscribeUrl, unsubscribeHeaders } = require('../lib/unsubscribe');

// Read back whatever stats we already hold for this contact.
//
// This is the ONLY moment a wiped device can be reunited with its streak.
// Stats live in localStorage, and so does the subscriber's email address — so
// when storage is cleared (or Safari's 7-day eviction fires on a lapsed
// player) we lose the streak AND every way of knowing whose streak it was.
// Nothing on page load can recover that. The one signal that ever comes back
// is the player typing their email in again, which is right here.
//
// Returns null on any failure: restoring is a bonus, never a reason to fail
// a signup.
// Resend exposes the contact under two path shapes and they have not behaved
// identically: the audience-scoped one is what the rest of this codebase uses,
// while the documented retrieve endpoint is unscoped. Try both rather than
// betting the feature on which one this account answers, and report which
// path produced the record so a failure is diagnosable from the response
// instead of guessing at it from the outside.
// The confirmation email body. Deliberately plain and short: one sentence, one
// button, no cover art and no marketing. It is the first thing a brand-new
// signup sees, it has to survive spam filters on a domain that is currently
// blocklisted, and the only job is getting one tap.
function confirmHtml(link) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm your Booky reminder</title></head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;padding:40px 16px;">
    <tr><td align="center" style="text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 28px;">
        <tr><td>
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#c8398f;margin:0 0 24px;letter-spacing:0.5px;">Booky</p>
          <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#2a0a26;">Almost there</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a2a4c;">Tap the button and your daily Booky reminder is on. That's the whole thing.</p>
          <p style="margin:0 0 24px;">
            <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);color:#ffffff;text-decoration:none;font-weight:600;padding:14px 30px;border-radius:10px;font-size:15px;">Yes, remind me daily</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#8a6a8c;">If you didn't sign up for Booky, just ignore this. Nothing happens and you won't hear from me again.</p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#a587a9;">Booky by 90books</p>
    </td></tr>
  </table>
</body>
</html>`;
}

async function fetchStoredStats(apiKey, audienceId, email) {
  const attempts = [
    ['audience', `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`],
    ['contacts', `https://api.resend.com/contacts/${encodeURIComponent(email)}`],
  ];

  for (const [via, url] of attempts) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      // 404 is a definitive answer, not a failure: no such contact yet. Say so
      // rather than trying the other path and ending up at 'read-failed',
      // which would report a first-time signup as a broken read.
      if (r.status === 404) return { stats: null, source: 'no-contact', exists: false, unsubscribed: null };
      if (!r.ok) {
        console.error('[booky-subscribe] stats read', via, 'HTTP', r.status);
        continue;
      }
      const body = await r.json();
      const raw = body?.data?.first_name ?? body?.first_name;
      // `unsubscribed` is read alongside the stats because double opt-in has to
      // tell three states apart: brand new (create as pending), already
      // confirmed (do NOT touch, they are a live subscriber), and pending from
      // an earlier signup (resend the confirmation). Without it the create below
      // would upsert `unsubscribed: true` over a confirmed subscriber and
      // silently unsubscribe someone who was happily receiving mail.
      const unsub = body?.data?.unsubscribed ?? body?.unsubscribed ?? null;
      // An existing contact with an empty field is a real answer, not a
      // failure — stop here rather than retrying the other path.
      if (raw == null || raw === '') return { stats: null, source: via + ':empty', exists: true, unsubscribed: unsub };
      return { stats: decodeStats(raw), source: via, exists: true, unsubscribed: unsub };
    } catch (err) {
      console.error('[booky-subscribe] stats read', via, 'threw:', err);
    }
  }
  // Read failed outright. `exists: null` means unknown, and the caller treats
  // unknown as "do not risk it" — it will not downgrade a contact it cannot see.
  return { stats: null, source: 'read-failed', exists: null, unsubscribed: null };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ---- Unsubscribe rides on this route ----
  // The footer link in every Booky email points here with `?unsub=1`. It is not
  // its own api/ file because the Hobby plan caps a deployment at 12 Serverless
  // Functions and api/ is already at 12 — a 13th breaks the entire build. See
  // lib/unsubscribe-handler.js. Checked before the POST-only guard because the
  // link is followed with GET.
  if (req.query && req.query.unsub) {
    await require('../lib/unsubscribe-handler')(req, res);
    return;
  }

  // ---- Double opt-in confirmation rides on this route too ----
  // Same reason as unsubscribe above: api/ is at the 12-function cap. The link
  // in the confirmation email points here with `?confirm=1`. Also before the
  // POST-only guard, because it is followed with GET from a mail client.
  if (req.query && req.query.confirm) {
    await require('../lib/confirm-handler')(req, res);
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Unauthenticated POST that spends a real resource. Fails open.
  if (await enforce(req, res, { name: 'subscribe', limit: 8 })) return;

  const { email, source, streak, stats, giveawayTag, giveawayTitle, giveawayAnnounce } = req.body || {};

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

  // Giveaway entry. `last_name` is the entry marker (first_name already holds
  // the streak). Without this tag there is no way to draw a winner — and in
  // particular an EXISTING subscriber who taps "count me in" would leave no
  // trace at all, since Resend 422s on a duplicate contact and updates nothing.
  const isGiveaway = ctx.source === 'giveaway' && typeof giveawayTag === 'string' && giveawayTag;
  const entryTag = isGiveaway ? giveawayTag.slice(0, 60) : null;

  // ---- Tier 1: Resend audience ----
  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
  if (RESEND_API_KEY && RESEND_AUDIENCE_ID) {
    try {
      // Read BEFORE the create, on purpose. Reading afterwards cannot tell a
      // returning player from a first-timer: for a brand-new contact the create
      // has already written this device's (empty) stats, so the read hands them
      // straight back and we would greet a first-time player with "found you".
      // Reading first, a 404 means new and a hit means returning, with no
      // dependence on which status Resend picks for a duplicate create.
      const read = await fetchStoredStats(RESEND_API_KEY, RESEND_AUDIENCE_ID, cleanEmail);

      // Merge what we already hold with what this device brought, and write the
      // BEST of the two.
      //
      // The comment below used to say a duplicate create returns 422 and writes
      // nothing, so an existing record was safe. That is no longer true —
      // Resend upserts, and the create overwrites. Verified against production:
      // a contact holding streak 33 / played 55 was reduced to zeros the moment
      // that player signed up again from a device with no history, which is the
      // exact situation this feature exists to rescue. The read above still
      // handed them their stats, so the restore looked fine, but the stored
      // copy was gone — and if they never finished another game to refresh it,
      // gone for good.
      //
      // Totals only ever climb, same rule the anonymous record uses. The
      // current streak is only carried over if the stored record is at least as
      // recent as this device's, so a live streak is never resurrected from a
      // stale one.
      const held = read.stats || null;
      const mine = { ...(stats || {}), currentStreak: ctx.streak || 0 };
      const best = held
        ? {
            maxStreak: Math.max(held.maxStreak || 0, mine.maxStreak || 0),
            played: Math.max(held.played || 0, mine.played || 0),
            wins: Math.max(held.wins || 0, mine.wins || 0),
            lastPlayedDay: Math.max(held.lastPlayedDay || 0, mine.lastPlayedDay || 0),
            currentStreak:
              (held.lastPlayedDay || 0) >= (mine.lastPlayedDay || 0)
                ? Math.max(held.currentStreak || 0, mine.currentStreak || 0)
                : (mine.currentStreak || 0),
          }
        : mine;

      // ---- DOUBLE OPT-IN: is this contact already a confirmed subscriber? ----
      // Only someone we can SEE is confirmed keeps `unsubscribed: false`. A new
      // address, or one still pending, is written as `unsubscribed: true` and
      // stays out of the daily send until they click the link in their email.
      //
      // `read.exists === null` means the read itself failed, so we do not know.
      // Unknown is treated as "already confirmed" ON PURPOSE: the create below
      // upserts, and wrongly writing `true` over a live subscriber would
      // silently stop their daily email, which is far worse than letting one
      // unverified address through on a day Resend's API was flaky.
      // `!== true` rather than `=== false` on purpose. If the contact exists but
      // the field is missing or null (an unexpected response shape), that is
      // ambiguity, and ambiguity must never cost a live subscriber their daily
      // email. Only an explicit `unsubscribed: true` counts as not-yet-confirmed.
      const alreadyConfirmed = read.exists === true && read.unsubscribed !== true;
      const readUnknown      = read.exists === null;
      const pending          = !(alreadyConfirmed || readUnknown);

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
            unsubscribed: pending,
            // first_name stores the packed stats block, streak first
            // (internal field — never shown in emails). See api/_stats-codec.js.
            first_name: encodeStats(best),
            // last_name stores the giveaway entry tag (internal field — never shown)
            ...(entryTag ? { last_name: entryTag } : {}),
            // A `properties` field was added here 2026-09-22 to make pending
            // vs confirmed visible in the Resend dashboard. Resend's Contacts
            // API does not accept that field in any shape (object or array —
            // both 422 "expected record, received array") and this endpoint
            // upserts, so the 422 was silently read as "contact already
            // exists" (see the comment on `read` above) rather than a real
            // failure — removed. `unsubscribed` is still the only field
            // api/booky-send.js filters on, so this never changed who gets
            // mail; it only broke the dashboard-only status label.
          }),
        }
      );

      // 422 means the contact already existed, so the POST above wrote nothing
      // and whatever stats we hold for them are still intact. That is exactly
      // the returning-player case: read the record back so the client can
      // restore it. A brand-new contact (r.ok) has nothing to restore.
      // Resend returns 422 when the contact already exists — treat as success.
      // For a giveaway entry we must still record the entry on that existing
      // contact, otherwise loyal subscribers silently never enter the draw.
      if (r.status === 422 && entryTag) {
        try {
          const patch = await fetch(
            `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(cleanEmail)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              // Writes the entry tag ONLY. This used to also send
              // `unsubscribed: false`, which would confirm a giveaway entrant
              // who never clicked the link and punch a hole straight through
              // double opt-in. Entering a giveaway records the entry; it does
              // not prove the address belongs to them.
              body: JSON.stringify({ last_name: entryTag }),
            }
          );
          if (!patch.ok) {
            const ptxt = await patch.text();
            console.error('[booky-subscribe] giveaway tag PATCH failed', patch.status, ptxt);
            // Surface it: a silent failure here means a missing entrant.
            res.status(500).json({ error: 'entry-not-recorded' });
            return;
          }
        } catch (err) {
          console.error('[booky-subscribe] giveaway tag PATCH exception:', err);
          res.status(500).json({ error: 'entry-not-recorded' });
          return;
        }
      }

      if (r.ok || r.status === 422) {
        // ---- DOUBLE OPT-IN: pending contacts get a confirmation, not a welcome ----
        // A pending contact is not on the daily send yet, so a "you're in" mail
        // would be a lie. Send the one email that can change that instead, and
        // send it whether the contact was just created (r.ok) or already existed
        // unconfirmed (422) — the second case is someone who signed up before and
        // never clicked, and they need the link again.
        if (pending) {
          const RESEND_FROM = 'Booky <booky@90books.com>';
          const { confirmUrl } = require('../lib/confirm');
          const link = confirmUrl(cleanEmail, entryTag);
          // A giveaway entrant gets an email about their ENTRY, not about a
          // daily reminder they never asked for. Same signed link either way.
          const gTitle    = (giveawayTitle || 'the book').slice(0, 120);
          const gAnnounce = (giveawayAnnounce || 'soon').slice(0, 40);
          const subject = entryTag
            ? `one tap to lock in your giveaway entry 🎁`
            : 'one tap and your Booky reminder is on 📚';
          const text = entryTag
            ? `Your entry isn't in yet.

Tap this to confirm your entry for ${gTitle}:
${link}

I'll pick the winner on ${gAnnounce}. Confirming also turns on the daily reminder.

Open worldwide. The winner gets a gift card for the book, so it works wherever you are. Free to enter, no purchase necessary.

If you didn't enter, ignore this and nothing happens. You won't hear from me again.

Booky by 90books`
            : `Almost there.

Tap this to turn on your daily Booky reminder:
${link}

If you didn't sign up for Booky, ignore this and nothing happens. You won't hear from me again.

Booky by 90books`;
          const html = entryTag
            ? buildGiveawayConfirmHtml({ title: gTitle, announce: gAnnounce, cover: req.body?.giveawayCover, link })
            : confirmHtml(link);
          try {
            const sendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: RESEND_FROM,
                to: cleanEmail,
                reply_to: 'booky@90books.com',
                // No List-Unsubscribe here on purpose. This is a transactional
                // confirmation to an address that is NOT on the list yet, and
                // offering to unsubscribe from something you have not joined is
                // just confusing. The daily mail carries the header.
                subject,
                text,
                html,
              }),
            });
            // This send used to go unchecked — a Resend-side rejection (bad
            // sender domain, rate limit, etc.) looked identical to success and
            // the pending backlog had no visible cause. Log the body so a
            // failure shows up in Vercel logs instead of vanishing silently.
            if (!sendRes.ok) {
              const errTxt = await sendRes.text();
              console.error('[booky-subscribe] confirmation email rejected:', sendRes.status, errTxt);
            }
          } catch (err) {
            console.error('[booky-subscribe] confirmation email failed:', err);
          }
        } else if (r.ok && entryTag) {
          // Giveaway entrant: confirm the entry (the on-screen "you're in" is
          // otherwise their only record) and name the announce date so the
          // result email is expected.
          // Player-facing mail is always Booky <booky@90books.com>, from and reply
          // alike. Deliberately NOT process.env.RESEND_FROM: that one variable is
          // read by every sender, so setting it would silently retarget these too.
          const RESEND_FROM = 'Booky <booky@90books.com>';
          const title = (giveawayTitle || 'the book').slice(0, 120);
          const announce = (giveawayAnnounce || 'soon').slice(0, 40);
          const playUrl = 'https://90books.com/booky?utm_source=giveaway_welcome&utm_medium=email&utm_campaign=giveaway_welcome';
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
                // Player-facing: replies go to booky@, the address readers already
                // know from the daily reminder. hello@ is for the contact page,
                // authors and press. Both reach the same inbox via forwarding.
                reply_to: 'booky@90books.com',
                subject: "🎁 You're entered · Booky giveaway",
                headers: unsubscribeHeaders(cleanEmail),
                text: `You're entered. 🎁

${title}

I'll pick one winner on ${announce} and announce it right here.

Until then, there's a new word every midnight. I'll remind you each evening so you don't lose your streak.

Play today's Booky: ${playUrl}

---
Booky by 90books · you signed up at 90books.com/booky`,
                html: buildGiveawayWelcomeHtml({ title, announce, playUrl, cover: req.body?.giveawayCover, unsubUrl: unsubscribeUrl(cleanEmail) }),
              }),
            });
          } catch (err) {
            console.error('[booky-subscribe] Giveaway welcome email failed:', err);
          }
        } else if (r.ok) {
          // Player-facing mail is always Booky <booky@90books.com>, from and reply
          // alike. Deliberately NOT process.env.RESEND_FROM: that one variable is
          // read by every sender, so setting it would silently retarget these too.
          const RESEND_FROM = 'Booky <booky@90books.com>';
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
                // Player-facing: replies go to booky@, the address readers already
                // know from the daily reminder. hello@ is for the contact page,
                // authors and press. Both reach the same inbox via forwarding.
                reply_to: 'booky@90books.com',
                subject: "you're in, Booky will remind you 📚",
                headers: unsubscribeHeaders(cleanEmail),
                text: `okay you're in. 📚

new word drops every midnight. i'll send you a reminder each evening so you don't lose your streak.

play today's word: https://90books.com/booky?utm_source=welcome_email&utm_medium=email&utm_campaign=welcome

reply "hi" or drag this to Primary so tomorrow's word doesn't get buried in promos.

olga from booky

---
Booky by 90books · you signed up at 90books.com/booky · reply to unsubscribe`,
                html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<style>
  body { margin:0; padding:0; background:#ffffff; font-family:Georgia,serif; font-size:16px; line-height:1.7; color:#1a1a1a; }
  .wrap { max-width:520px; margin:0 auto; padding:36px 24px; }
  p { margin:0 0 18px; }
  a { color:#9333d9; }
  .footer { margin-top:36px; font-size:12px; color:#aaaaaa; font-family:Arial,sans-serif; line-height:1.6; }
  .footer a { color:#aaaaaa; }
  @media (prefers-color-scheme: dark) {
    body { background:#160516 !important; color:#f0e4f8 !important; }
    .footer { color:#886688 !important; }
    .footer a { color:#886688 !important; }
  }
</style>
</head>
<body>
<div class="wrap">
  <p>okay you're in. 📚</p>
  <p>new word drops every midnight. i'll send you a reminder each evening so you don't lose your streak.</p>
  <p><a href="https://90books.com/booky?utm_source=welcome_email&utm_medium=email&utm_campaign=welcome">play today's word →</a></p>
  <p>reply "hi" or drag this to Primary so tomorrow's word doesn't get buried in promos.</p>
  <p>olga from booky</p>
  <p class="footer">
    Booky by 90books · you signed up at 90books.com/booky<br>
    <a href="${unsubscribeUrl(cleanEmail)}">unsubscribe</a>
  </p>
</div>
</body>
</html>`,
              }),
            });
          } catch (err) {
            // Welcome email failure is non-fatal — contact is already saved
            console.error('[booky-subscribe] Welcome email failed:', err);
          }
        }
        // stats_source names which read path answered (or why none did). It
        // carries no contact data — it is the difference between "this player
        // has no record" and "we could not read the record", which are the
        // same `stats: null` to the client but very different bugs.
        // `pending` tells the win screen which sentence to show: "check your
        // inbox" for a contact that still has to confirm, or the usual "you're
        // in" for someone who was already a confirmed subscriber. Without it the
        // UI would promise a daily email we are not going to send yet.
        res.status(200).json({ ok: true, stored: 'resend', pending, stats: read.stats, stats_source: read.source });
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

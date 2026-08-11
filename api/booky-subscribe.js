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
function buildGiveawayWelcomeHtml({ title, announce, playUrl, cover }) {
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
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#c8398f;margin:0 0 4px;letter-spacing:0.5px;">Booky</p>
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
            <a href="mailto:hello@90books.com?subject=unsubscribe" style="color:#a587a9;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const { enforce } = require('./_rate-limit');
const { encodeStats, decodeStats } = require('./_stats-codec');

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
      if (r.status === 404) return { stats: null, source: 'no-contact' };
      if (!r.ok) {
        console.error('[booky-subscribe] stats read', via, 'HTTP', r.status);
        continue;
      }
      const body = await r.json();
      const raw = body?.data?.first_name ?? body?.first_name;
      // An existing contact with an empty field is a real answer, not a
      // failure — stop here rather than retrying the other path.
      if (raw == null || raw === '') return { stats: null, source: via + ':empty' };
      return { stats: decodeStats(raw), source: via };
    } catch (err) {
      console.error('[booky-subscribe] stats read', via, 'threw:', err);
    }
  }
  return { stats: null, source: 'read-failed' };
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
            // first_name stores the packed stats block, streak first
            // (internal field — never shown in emails). See api/_stats-codec.js.
            first_name: encodeStats({ ...(stats || {}), currentStreak: ctx.streak || 0 }),
            // last_name stores the giveaway entry tag (internal field — never shown)
            ...(entryTag ? { last_name: entryTag } : {}),
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
              body: JSON.stringify({ last_name: entryTag, unsubscribed: false }),
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
        // Send welcome email only for brand-new signups (r.ok), not re-subscribes (422)
        if (r.ok && entryTag) {
          // Giveaway entrant: confirm the entry (the on-screen "you're in" is
          // otherwise their only record) and name the announce date so the
          // result email is expected.
          const RESEND_FROM = process.env.RESEND_FROM || 'Olga from Booky <hello@90books.com>';
          const UNSUBSCRIBE = '<mailto:hello@90books.com?subject=unsubscribe>';
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
                reply_to: 'hello@90books.com',
                subject: "🎁 You're entered · Booky giveaway",
                headers: {
                  'List-Unsubscribe': UNSUBSCRIBE,
                  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
                text: `You're entered. 🎁

${title}

I'll pick one winner on ${announce} and announce it right here.

Until then, there's a new word every midnight. I'll remind you each evening so you don't lose your streak.

Play today's Booky: ${playUrl}

---
Booky by 90books · you signed up at 90books.com/booky`,
                html: buildGiveawayWelcomeHtml({ title, announce, playUrl, cover: req.body?.giveawayCover }),
              }),
            });
          } catch (err) {
            console.error('[booky-subscribe] Giveaway welcome email failed:', err);
          }
        } else if (r.ok) {
          const RESEND_FROM = process.env.RESEND_FROM || 'Olga from Booky <hello@90books.com>';
          const UNSUBSCRIBE  = '<mailto:hello@90books.com?subject=unsubscribe>';
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
                reply_to: 'hello@90books.com',
                subject: "you're in, Booky will remind you 📚",
                headers: {
                  'List-Unsubscribe': UNSUBSCRIBE,
                  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
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
    <a href="mailto:hello@90books.com?subject=unsubscribe">unsubscribe</a>
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
        res.status(200).json({ ok: true, stored: 'resend', stats: read.stats, stats_source: read.source });
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

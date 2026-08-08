// api/booky-send.js — daily Booky reminder (personalized per subscriber).
// Triggered by Vercel Cron (see vercel.json) once a day.
//
// Flow:
//   1. Verify the request came from Vercel Cron (Bearer ${CRON_SECRET})
//   2. Fetch all active subscribers from Resend audience
//   3. Send each subscriber a personalized email showing their streak
//
// Streak is stored in contact.first_name as a string number (internal only).
//
// Env vars:
//   RESEND_API_KEY          — sk_xxx from resend.com/api-keys
//   RESEND_AUDIENCE_ID      — uuid from resend.com/audiences
//   RESEND_FROM             — verified sender, e.g. "Booky <booky@90books.com>"
//   CRON_SECRET             — random string, Vercel auto-attaches as Bearer

// ---- One-off notes, keyed by the UTC date of the send ----
//
// ⚠️ THIS MECHANISM SILENTLY FAILED AND IS NOT TRUSTED. Do not use it to
// announce anything until it is root-caused. On 2026-08-07 a note keyed
// '2026-08-07' did not appear in that evening's email. Everything checked out
// and it still did not send: the deployed source on the live-aliased deployment
// contained the key, that deployment was production at 23:00 UTC, the send went
// out at 23:16 UTC (so `toISOString().slice(0,10)` was '2026-08-07'), and
// book-recs-app is definitely the sender — booky-deploy has no Resend key and
// 500s. The raw message source showed the note block simply absent, meaning
// `updateNote` was null at runtime. Unexplained.
//
// The gap that let it ship: `buildHtml` was verified locally, which proves
// nothing about what the deployed cron emits. There is no way to see a rendered
// email without sending to the whole audience, so a failure here is invisible
// until subscribers get the wrong thing.
//
// Announcements now go out as a Resend Broadcast instead (composed and sent from
// the dashboard, visible before it sends). See scripts/create-broadcast.mjs.
//
// Kept empty rather than deleted so the wiring — and this warning — survive. If
// you ever repopulate it, first add a preview mode that returns the HTML without
// sending, and confirm the note is in the bytes the DEPLOYED endpoint returns.
const UPDATE_NOTES = {};

module.exports = async (req, res) => {
  // ---- Auth: only allow Vercel Cron (or manual via x-debug-key=CRON_SECRET) ----
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET) {
    const auth = req.headers.authorization || '';
    const debugKey = req.headers['x-debug-key'] || '';
    const ok = auth === `Bearer ${CRON_SECRET}` || debugKey === CRON_SECRET;
    if (!ok) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
  const RESEND_FROM        = process.env.RESEND_FROM || 'Booky <booky@90books.com>';

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    console.error('[booky-send] Resend env not configured');
    res.status(500).json({ error: 'Resend not configured' });
    return;
  }

  // UTM-tagged so PostHog attributes return plays to the daily reminder email.
  const playUrl = 'https://90books.com/booky?utm_source=reminder_email&utm_medium=email&utm_campaign=daily_reminder';
  const today   = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // UTC date key for today's send. Vercel Cron runs in UTC, so this is stable.
  const dateKey    = new Date().toISOString().slice(0, 10);
  const updateNote = UPDATE_NOTES[dateKey] || null;

  // ---- 1. Fetch all active subscribers ----
  let subscribers = [];
  try {
    const r = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
    );
    if (!r.ok) {
      const txt = await r.text();
      console.error('[booky-send] failed to fetch contacts', r.status, txt);
      res.status(500).json({ error: 'failed to fetch contacts', detail: txt });
      return;
    }
    const data = await r.json();
    subscribers = (data.data || []).filter(c => !c.unsubscribed);
  } catch (err) {
    console.error('[booky-send] fetch contacts exception:', err);
    res.status(500).json({ error: 'exception fetching contacts', detail: String(err) });
    return;
  }

  if (subscribers.length === 0) {
    console.log('[booky-send] no active subscribers, nothing to send');
    res.status(200).json({ ok: true, sent: 0 });
    return;
  }

  // ---- 2. Send personalized email to each subscriber ----
  let sent = 0;
  let failed = 0;

  for (const contact of subscribers) {
    // streak stored in first_name as a string (set by booky-subscribe + booky-update-streak)
    const streak = parseInt(contact.first_name, 10) || 0;
    const hasStreak = streak >= 2;

    const subject = hasStreak
      ? `🔥 Day ${streak} — don't lose it now`
      : `Today's Booky is ready 📚`;

    const headline = hasStreak
      ? `Your 🔥${streak}-day streak is waiting.`
      : `Today's word is waiting.`;

    const subline = hasStreak
      ? `Six guesses. Don't break your ${streak}-day streak.`
      : `Six guesses. Don't break the streak.`;

    const html = buildHtml({ subject, headline, subline, today, playUrl, updateNote });

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: contact.email,
          subject,
          html,
          tags: [{ name: 'type', value: 'booky-daily' }],
        }),
      });

      if (r.ok) {
        sent++;
      } else {
        const txt = await r.text();
        console.error('[booky-send] failed for', contact.email, r.status, txt);
        failed++;
      }
    } catch (err) {
      console.error('[booky-send] exception for', contact.email, err);
      failed++;
    }
  }

  console.log(`[booky-send] done — sent: ${sent}, failed: ${failed}`);
  res.status(200).json({ ok: true, sent, failed, total: subscribers.length });
};

function buildHtml({ subject, headline, subline, today, playUrl, updateNote }) {
  // Sits below the play button so the reminder's primary CTA still comes first.
  const noteBlock = updateNote ? `
        <tr><td style="padding-top:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf2f9;border:1px solid #f0d8ea;border-radius:10px;padding:18px 20px;">
            <tr><td>
              <p style="margin:0 0 6px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c8398f;font-weight:700;">Game update</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.45;color:#2a0a26;font-weight:600;">${updateNote.title}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6a4a6c;">${updateNote.body}</p>
            </td></tr>
          </table>
        </td></tr>` : '';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 28px;">
        <tr><td align="center">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#c8398f;margin:0 0 4px;letter-spacing:0.5px;">Booky</p>
          <p style="margin:0 0 24px;color:#a587a9;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">${today}</p>
          <p style="margin:0 0 12px;font-size:18px;line-height:1.5;color:#2a0a26;font-weight:600;">${headline}</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#6a4a6c;">${subline}</p>
          <a href="${playUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px;">Play today's Booky →</a>
        </td></tr>${noteBlock}
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6a4a6c;">
            Know a reader who'd love this? Send them <a href="https://90books.com/booky?utm_source=reminder_email&utm_medium=email&utm_campaign=friend_referral" style="color:#c8398f;text-decoration:none;">90books.com/booky</a>
          </p>
        </td></tr>
        <tr><td align="center" style="padding-top:32px;">
          <p style="margin:0;font-size:11px;color:#a587a9;line-height:1.5;">
            Booky by 90books · you signed up for daily reminders at <a href="${playUrl}" style="color:#c8398f;text-decoration:none;">90books.com/booky</a>.<br>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#a587a9;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

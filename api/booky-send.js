// api/booky-send.js — daily Booky reminder broadcast.
// Triggered by Vercel Cron (see vercel.json) once a day.
//
// Flow:
//   1. Verify the request came from Vercel Cron (Bearer ${CRON_SECRET})
//   2. Create a Resend broadcast for the Booky Daily audience
//   3. Immediately send it
//
// Env vars:
//   RESEND_API_KEY          — sk_xxx from resend.com/api-keys
//   RESEND_AUDIENCE_ID      — uuid from resend.com/audiences
//   RESEND_FROM             — verified sender, e.g. "Booky <booky@90books.com>"
//   CRON_SECRET             — random string, Vercel auto-attaches as Bearer
//                             (set in Vercel dashboard → Cron → Secret)

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

  const subject = "Today's Booky is ready 📚";
  const playUrl = 'https://90books.com/booky';
  const today   = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Plain HTML email. Light-bg for max compatibility across mail clients.
  // Resend automatically appends an unsubscribe link via {{{RESEND_UNSUBSCRIBE_URL}}}.
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 28px;">
        <tr><td align="center">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#c8398f;margin:0 0 4px;letter-spacing:0.5px;">Booky</p>
          <p style="margin:0 0 24px;color:#a587a9;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">${today}</p>
          <p style="margin:0 0 24px;font-size:17px;line-height:1.5;color:#2a0a26;">Today's word is waiting.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#6a4a6c;">Six guesses. Don't break the streak.</p>
          <a href="${playUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px;">Play today's Booky →</a>
        </td></tr>
        <tr><td align="center" style="padding-top:32px;">
          <p style="margin:0;font-size:11px;color:#a587a9;line-height:1.5;">
            You're getting this because you signed up for daily reminders at <a href="${playUrl}" style="color:#c8398f;text-decoration:none;">90books.com/booky</a>.<br>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#a587a9;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    // Step 1 — create draft broadcast
    const createR = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audience_id: RESEND_AUDIENCE_ID,
        from: RESEND_FROM,
        subject,
        html,
      }),
    });

    if (!createR.ok) {
      const txt = await createR.text();
      console.error('[booky-send] broadcast create failed', createR.status, txt);
      res.status(500).json({ error: 'broadcast create failed', detail: txt });
      return;
    }
    const created = await createR.json();
    const broadcastId = created?.data?.id || created?.id;
    if (!broadcastId) {
      res.status(500).json({ error: 'no broadcast id returned', payload: created });
      return;
    }

    // Step 2 — send immediately
    const sendR = await fetch(
      `https://api.resend.com/broadcasts/${broadcastId}/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!sendR.ok) {
      const txt = await sendR.text();
      console.error('[booky-send] broadcast send failed', sendR.status, txt);
      res.status(500).json({ error: 'broadcast send failed', detail: txt });
      return;
    }

    console.log('[booky-send] broadcast sent', broadcastId);
    res.status(200).json({ ok: true, broadcastId });
  } catch (err) {
    console.error('[booky-send] exception:', err);
    res.status(500).json({ error: 'exception', detail: String(err) });
  }
};

// api/feedback.js — stores reader feedback / feature requests in Airtable
// Env vars (set in Vercel dashboard → Settings → Environment Variables):
//   AIRTABLE_API_KEY     — Personal Access Token (data:records:write on the base)
//   AIRTABLE_BASE_ID     — e.g. appXXXXXXXXXXXXXX
//   AIRTABLE_FEEDBACK_TABLE — table name, default "Feedback"

const { enforce } = require('./_rate-limit');

// WHY THIS EMAILS AND DOES NOT ONLY WRITE TO AIRTABLE:
// a player reported on r/B00KY that ymail.com could not sign up. It sat
// unanswered for three days because nothing told anyone it existed, and the
// only reason it was ever seen was Olga opening Reddit by accident. A report
// that lands in a dashboard nobody opens is the same as no report. This goes
// to a Gmail so it arrives with a notification, and every send is also visible
// in the Resend log, so there are two places to check and neither needs
// Airtable to be configured. Note the tradeoff of the booky@ address: it has
// no push notification the way a Gmail does, so it is checked, not announced.
async function emailFeedback({ type, message, email, page, ua }) {
  const KEY = process.env.RESEND_API_KEY;
  // Olga's call, 27 Oct: booky@90books.com is the address readers write to. It
  // is an ImprovMX forward, not a mailbox, so there is nothing there I can read
  // on her behalf. Second copy to her own Gmail, which I do have API access to,
  // so a bug report gets seen daily instead of sitting unread.
  // FEEDBACK_TO overrides the whole list without a deploy (comma separated).
  const TO  = (process.env.FEEDBACK_TO || 'booky@90books.com,omrvieito@gmail.com')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (!KEY) return { sent: false, reason: 'no-resend-key' };
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const from = email && email.includes('@') ? email : null;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Booky <booky@90books.com>',
        to: TO,
        // Replying in Gmail goes straight back to the player. That is the whole
        // point: a bug report you cannot answer is half a conversation.
        ...(from ? { reply_to: from } : {}),
        subject: `Booky feedback: ${String(type || 'general').slice(0, 40)}${from ? ` from ${from}` : ''}`,
        tags: [{ name: 'type', value: 'player-feedback' }],
        text: `${message}\n\n---\nfrom: ${from || '(no email given)'}\npage: ${page || '?'}\ndevice: ${ua || '?'}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a0a26;max-width:560px">
  <p style="font-size:16px;line-height:1.6;white-space:pre-wrap;margin:0 0 20px">${esc(message)}</p>
  <table style="font-size:13px;color:#6a4a6c;border-top:1px solid #ead4e2;padding-top:12px;width:100%">
    <tr><td style="padding:3px 10px 3px 0">from</td><td>${from ? `<a href="mailto:${esc(from)}">${esc(from)}</a>` : '(no email given)'}</td></tr>
    <tr><td style="padding:3px 10px 3px 0">page</td><td>${esc(page || '?')}</td></tr>
    <tr><td style="padding:3px 10px 3px 0">device</td><td>${esc(ua || '?')}</td></tr>
  </table>
</div>`,
      }),
    });
    if (!r.ok) {
      console.error('[feedback] resend failed', r.status, await r.text());
      return { sent: false, reason: 'resend-' + r.status };
    }
    return { sent: true };
  } catch (err) {
    console.error('[feedback] resend threw:', err);
    return { sent: false, reason: 'threw' };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Unauthenticated POST that spends a real resource. Fails open.
  if (await enforce(req, res, { name: 'feedback', limit: 10 })) return;

  const { message, type, email, page } = req.body || {};
  const ua = String(req.headers['user-agent'] || '').slice(0, 160);

  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    res.status(400).json({ error: 'Feedback message required' });
    return;
  }

  // Sent before Airtable is even considered: the mail is the part that gets
  // read, and it must not depend on a table that may not be configured.
  const mail = await emailFeedback({ type, message: message.trim(), email, page, ua });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE   = process.env.AIRTABLE_FEEDBACK_TABLE || 'Feedback';

  // If Airtable isn't configured yet, log & succeed so the UI still works
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[feedback] No Airtable configured — received:', {
      type: (type || 'general').trim(),
      message: message.trim(),
      email: (email || '').trim(),
    });
    res.status(200).json({ ok: true, emailed: mail.sent });
    return;
  }

  try {
    const atResp = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Type:      (type || 'general').trim().slice(0, 80),
            Message:   message.trim().slice(0, 5000),
            Submitted: new Date().toISOString(),
            ...(email && email.includes('@') ? { Email: email.trim().slice(0, 200) } : {}),
          },
        }),
      }
    );

    if (!atResp.ok) {
      const errText = await atResp.text();
      console.error('[feedback] Airtable error:', atResp.status, errText);
      // The email already went. Failing the request here would show the player
      // an error and invite them to send it again, duplicating a report that
      // actually arrived. Airtable is the secondary copy, so it fails quietly.
      res.status(200).json({ ok: true, emailed: mail.sent, stored: false });
      return;
    }

    res.status(200).json({ ok: true, emailed: mail.sent });
  } catch (err) {
    console.error('[feedback] Unexpected error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

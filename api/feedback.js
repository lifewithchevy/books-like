// api/feedback.js — stores reader feedback / feature requests in Airtable
// Env vars (set in Vercel dashboard → Settings → Environment Variables):
//   AIRTABLE_API_KEY     — Personal Access Token (data:records:write on the base)
//   AIRTABLE_BASE_ID     — e.g. appXXXXXXXXXXXXXX
//   AIRTABLE_FEEDBACK_TABLE — table name, default "Feedback"

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message, type, email } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    res.status(400).json({ error: 'Feedback message required' });
    return;
  }

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
    res.status(200).json({ ok: true });
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
      res.status(502).json({ error: 'Could not save feedback' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[feedback] Unexpected error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

// api/suggest.js — stores book suggestions in Airtable
// Env vars needed (set in Vercel dashboard → Settings → Environment Variables):
//   AIRTABLE_API_KEY   — Personal Access Token (data:records:write on the base)
//   AIRTABLE_BASE_ID   — e.g. appXXXXXXXXXXXXXX
//   AIRTABLE_TABLE     — table name, default "Suggestions"

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { book, context, note, email } = req.body || {};

  if (!book || typeof book !== 'string' || book.trim().length < 2) {
    res.status(400).json({ error: 'Book title required' });
    return;
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE   = process.env.AIRTABLE_TABLE || 'Suggestions';

  // If Airtable isn't configured yet, log & return success so the UI still works
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('[suggest] No Airtable configured — received:', {
      book: book.trim(),
      context: (context || '').trim(),
      note: (note || '').trim(),
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
            Book:      book.trim().slice(0, 200),
            Context:   (context || '').trim().slice(0, 200),
            Note:      (note || '').trim().slice(0, 1000),
            Submitted: new Date().toISOString(),
            ...(email && email.includes('@') ? { Email: email.trim().slice(0, 200) } : {}),
          },
        }),
      }
    );

    if (!atResp.ok) {
      const errText = await atResp.text();
      console.error('[suggest] Airtable error:', atResp.status, errText);
      res.status(502).json({ error: 'Could not save suggestion' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[suggest] Unexpected error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

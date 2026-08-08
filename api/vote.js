// api/vote.js — aggregated up/down votes for "books like X" recs, stored in
// Vercel KV / Upstash Redis. Powers the public social-proof count under each rec.
//
// Env vars (auto-injected when you connect a Vercel KV / Upstash store, or set
// manually in Vercel → Settings → Environment Variables):
//   KV_REST_API_URL   + KV_REST_API_TOKEN          (Vercel KV)
//   — or —
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  (Upstash direct)
//
// Storage model: one Redis hash per source book, key "votes:{source}", with
// fields "{rec}|up" and "{rec}|down" holding integer counts. Downvotes are
// stored but never returned/shown publicly — they're a private curation signal.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const clean = (s, max) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 '&:.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max || 120);

// Upstash REST: GET {URL}/{cmd}/{arg}/{arg}... with Bearer token → { result }.
async function redis(...args) {
  const path = args.map((a) => encodeURIComponent(a)).join('/');
  const r = await fetch(`${REST_URL}/${path}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const data = await r.json();
  return data.result;
}

const { enforce } = require('./_rate-limit');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Not configured yet → tell the client so it falls back to local-only voting.
  if (!REST_URL || !REST_TOKEN) {
    res.status(200).json({ disabled: true });
    return;
  }

  try {
    // GET ?source=X → public up-counts for every rec on that page: { rec: up }
    if (req.method === 'GET') {
      const source = clean(req.query.source);
      if (!source) { res.status(400).json({ error: 'source required' }); return; }
      const flat = (await redis('hgetall', `votes:${source}`)) || [];
      const counts = {};
      for (let i = 0; i < flat.length; i += 2) {
        const field = flat[i];
        const val = parseInt(flat[i + 1], 10) || 0;
        const sep = field.lastIndexOf('|');
        if (sep < 0) continue;
        const rec = field.slice(0, sep);
        const dir = field.slice(sep + 1);
        if (dir === 'up') counts[rec] = val; // only up-counts are public
      }
      res.status(200).json({ counts });
      return;
    }

    if (req.method === 'POST') {
      // Public write with no auth: the up-counts are shown as social proof under
      // each rec, so an unthrottled POST lets anyone manufacture that proof (and
      // burn Redis commands doing it). GET stays unlimited — reads are the point.
      if (await enforce(req, res, { name: 'vote', limit: 120 })) return;

      const { source, rec, dir, prev } = req.body || {};
      const s = clean(source);
      const r = clean(rec);
      if (!s || !r || (dir !== 'up' && dir !== 'down')) {
        res.status(400).json({ error: 'source, rec, dir required' });
        return;
      }
      const key = `votes:${s}`;
      // Switching vote? remove the previous direction's count first.
      if ((prev === 'up' || prev === 'down') && prev !== dir) {
        await redis('hincrby', key, `${r}|${prev}`, '-1');
      }
      // Only count the new vote if it's actually new or a switch (not a re-click).
      if (prev !== dir) {
        await redis('hincrby', key, `${r}|${dir}`, '1');
      }
      const up = parseInt((await redis('hget', key, `${r}|up`)) || '0', 10);
      res.status(200).json({ up }); // never return the down count
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[vote] error:', err);
    res.status(200).json({ disabled: true }); // fail soft — UI keeps working locally
  }
};

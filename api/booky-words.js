// Live Booky word queue for 90books.com.
//
// /booky/words.json on the book-recs-app project is stuck on a frozen CDN
// object (Jul 18 still BLOOM). booky-deploy.vercel.app has the current queue
// (Jul 18 = HONEY). This API route always hits origin (never that static CDN
// path) and proxies the live file.

const fs = require('fs');
const path = require('path');

const UPSTREAM = 'https://booky-deploy.vercel.app/booky/words.json';
const NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';
const LOCAL_WORDS = path.join(__dirname, '..', 'booky', 'words.json');

// The word QUEUE is owned upstream (booky-deploy), but the giveaway card is
// owned by THIS repo — so layer the local `giveaway` object onto the proxied
// payload. Without this the card can never render, because the client only
// ever sees the upstream file and that file has no `giveaway` key.
// Fails open: any problem here just returns the upstream body untouched.
function withLocalGiveaway(body) {
  try {
    const local = JSON.parse(fs.readFileSync(LOCAL_WORDS, 'utf8'));
    if (!local || !local.giveaway) return body;
    const upstream = JSON.parse(body);
    upstream.giveaway = local.giveaway;
    return JSON.stringify(upstream);
  } catch (e) {
    console.error('[booky-words] giveaway merge skipped:', e && e.message);
    return body;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', NO_STORE);
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const r = await fetch(UPSTREAM, {
      headers: { 'user-agent': '90books-booky-words-api' },
      cache: 'no-store',
    });
    if (!r.ok) {
      res.status(502).json({ error: 'upstream words.json failed', status: r.status });
      return;
    }
    const body = await r.text();
    const merged = withLocalGiveaway(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Booky-Words', merged === body ? 'proxy-booky-deploy' : 'proxy-booky-deploy+giveaway');
    res.status(200).send(merged);
  } catch (e) {
    res.status(502).json({ error: 'upstream words.json error', message: String(e && e.message || e) });
  }
};

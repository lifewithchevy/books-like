// Live Booky word queue for 90books.com.
//
// /booky/words.json on the book-recs-app project is stuck on a frozen CDN
// object (Jul 18 still BLOOM). booky-deploy.vercel.app has the current queue
// (Jul 18 = HONEY). This API route always hits origin (never that static CDN
// path) and proxies the live file.

const UPSTREAM = 'https://booky-deploy.vercel.app/booky/words.json';
const NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';

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
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Booky-Words', 'proxy-booky-deploy');
    res.status(200).send(body);
  } catch (e) {
    res.status(502).json({ error: 'upstream words.json error', message: String(e && e.message || e) });
  }
};

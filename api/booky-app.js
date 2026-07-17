// Booky client JS with word-queue fetch pointed at /api/booky-words.
//
// /booky/app.js on 90books.com is frozen on the CDN (still fetches the stale
// /booky/words.json). Serve a fresh copy from booky-deploy and rewrite the
// queue URL to the live API proxy.

const UPSTREAM = 'https://booky-deploy.vercel.app/booky/app.js';
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
      headers: { 'user-agent': '90books-booky-app-api' },
      cache: 'no-store',
    });
    if (!r.ok) {
      res.status(502).json({ error: 'upstream app.js failed', status: r.status });
      return;
    }
    let js = await r.text();
    // Point the queue fetch at the live API (bypasses frozen /booky/words.json).
    // Upstream may still reference /booky/words.json (or daily-words); after this
    // lands on booky-deploy it may already use /api/booky-words — leave that be.
    if (!js.includes("/api/booky-words")) {
      js = js.replace(
        /fetch\(\s*['"]\/booky\/(?:daily-)?words\.json[^'"]*['"]\s*,\s*\{\s*cache:\s*['"]no-store['"]\s*\}\s*\)/g,
        "fetch('/api/booky-words', { cache: 'no-store' })"
      );
    }
    // Dictionary on 90books.com /booky/ may also be stale; load from booky-deploy
    // (ACAO *). Skip if already absolute.
    if (js.includes("fetch('/booky/dictionary.json") || js.includes('fetch("/booky/dictionary.json')) {
      js = js.replace(
        /fetch\(\s*['"]\/booky\/dictionary\.json[^'"]*['"]/g,
        "fetch('https://booky-deploy.vercel.app/booky/dictionary.json'"
      );
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('X-Booky-App', 'proxy-booky-deploy');
    res.status(200).send(js);
  } catch (e) {
    res.status(502).json({ error: 'upstream app.js error', message: String(e && e.message || e) });
  }
};

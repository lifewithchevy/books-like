// Live Booky HTML shell for 90books.com.
//
// Used when /booky is still served from a frozen CDN object and middleware
// cannot intercept it. Callers can hit /api/booky-page directly; middleware
// prefers to serve the same HTML at /booky when the edge invokes it.

const BOOKY_DEPLOY = 'https://booky-deploy.vercel.app';
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
    const r = await fetch(`${BOOKY_DEPLOY}/booky`, {
      headers: { 'user-agent': '90books-booky-page-api' },
      cache: 'no-store',
    });
    if (!r.ok) {
      res.status(502).json({ error: 'upstream booky page failed', status: r.status });
      return;
    }
    let html = await r.text();
    html = html
      .replace(/\/booky\/styles\.css[^"']*/g, `${BOOKY_DEPLOY}/booky/styles.css`)
      .replace(/\/booky\/app\.js[^"']*/g, '/api/booky-app')
      .replace(/\/booky\/og-image\.png/g, `${BOOKY_DEPLOY}/booky/og-image.png`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Booky-Page', 'proxy-booky-deploy');
    res.status(200).send(html);
  } catch (e) {
    res.status(502).json({ error: 'upstream booky page error', message: String(e && e.message || e) });
  }
};

// Live Booky HTML shell for 90books.com.
//
// Used when /booky is still served from a frozen CDN object and middleware
// cannot intercept it. Callers can hit /api/booky-page directly; middleware
// prefers to serve the same HTML at /booky when the edge invokes it.

const fs = require('fs');
const path = require('path');

const BOOKY_DEPLOY = 'https://booky-deploy.vercel.app';
const NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';
const LOCAL_PAGE = path.join(__dirname, '..', 'booky', 'index.html');

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
      // booky-deploy went 404 on every path on 2026-08-04, which left this
      // route answering 502. /booky itself is served from the repo so the game
      // was unaffected, but any caller of this endpoint got nothing. Serve the
      // repo's own shell instead of failing.
      return serveLocal(res, `upstream-${r.status}`);
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
    return serveLocal(res, 'upstream-error');
  }
};

// The repo's own Booky shell. It already points at /api/booky-app and
// same-origin assets, so nothing needs rewriting.
function serveLocal(res, reason) {
  try {
    const html = fs.readFileSync(LOCAL_PAGE, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Booky-Page', `local-fallback:${reason}`);
    res.status(200).send(html);
  } catch (err) {
    console.error('[booky-page] local fallback failed:', err && err.message);
    res.status(502).json({ error: 'upstream and local booky page both failed', reason });
  }
}

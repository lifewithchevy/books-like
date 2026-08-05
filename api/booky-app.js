// Booky client JS for 90books.com.
//
// Prefer the local booky/app.js from this deployment so game fixes (e.g.
// pull-to-refresh) ship with Force production alias. Fall back to
// booky-deploy only if the local file is missing. Always rewrite the
// dictionary fetch to booky-deploy + DICT_CACHE_V, and point the queue at
// /api/booky-words when needed.

const fs = require('fs');
const path = require('path');

const UPSTREAM = 'https://booky-deploy.vercel.app/booky/app.js';
const NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';
// Bump with dictionary.json edits so /api/booky-app always emits a fresh URL
// even if upstream booky-deploy app.js is briefly still on an older ?v=.
const DICT_CACHE_V = 15;
const LOCAL_APP = path.join(__dirname, '..', 'booky', 'app.js');

function rewriteAppJs(js) {
  // Point the queue fetch at the live API (bypasses frozen /booky/words.json).
  if (!js.includes('/api/booky-words')) {
    js = js.replace(
      /fetch\(\s*['"]\/booky\/(?:daily-)?words\.json[^'"]*['"]\s*,\s*\{\s*cache:\s*['"]no-store['"]\s*\}\s*\)/g,
      "fetch('/api/booky-words', { cache: 'no-store' })"
    );
  }
  // Dictionary stays SAME-ORIGIN. It used to be rewritten to an absolute
  // booky-deploy URL to dodge a stale CDN copy, but on 2026-08-04 that whole
  // project began 404ing and took the game down with it: the dictionary fetch
  // rejected, the Promise.all in init() rejected, and every player saw
  // "Couldn't load today's word". A stale dictionary is a bad guess check; an
  // unreachable one is a dead game. DICT_CACHE_V still busts force-cache.
  // fetch( AND fetchJSON( — booky/app.js now boots through a retry wrapper,
  // and matching only `fetch(` silently turned DICT_CACHE_V into a no-op.
  js = js.replace(
    /(fetch(?:JSON)?)\(\s*['"](?:https:\/\/booky-deploy\.vercel\.app)?\/booky\/dictionary\.json[^'"]*['"]/g,
    (_m, fn) => `${fn}('/booky/dictionary.json?v=${DICT_CACHE_V}'`
  );
  return js;
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
    let js = null;
    let source = 'local';
    try {
      js = fs.readFileSync(LOCAL_APP, 'utf8');
    } catch (e) {
      js = null;
    }

    if (!js) {
      source = 'proxy-booky-deploy';
      const r = await fetch(UPSTREAM, {
        headers: { 'user-agent': '90books-booky-app-api' },
        cache: 'no-store',
      });
      if (!r.ok) {
        res.status(502).json({ error: 'upstream app.js failed', status: r.status });
        return;
      }
      js = await r.text();
    }

    js = rewriteAppJs(js);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('X-Booky-App', source);
    res.status(200).send(js);
  } catch (e) {
    res.status(502).json({ error: 'booky-app error', message: String(e && e.message || e) });
  }
};

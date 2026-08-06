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

// The word QUEUE is owned upstream (booky-deploy). THIS repo owns:
//   - `giveaway` (date-driven promo card; upstream may lack it entirely)
//   - `wordBooks[].cover` overrides (Amazon ASINs go dead; local fixes must
//     reach /api/booky-words even when booky-deploy's static words.json is a
//     sticky CDN HIT)
// Fails open: any problem here just returns the upstream body untouched.
function withLocalOverlays(body) {
  try {
    const local = JSON.parse(fs.readFileSync(LOCAL_WORDS, 'utf8'));
    if (!local) return { body, parts: [] };
    const upstream = JSON.parse(body);
    const parts = [];

    if (local.giveaway) {
      upstream.giveaway = local.giveaway;
      parts.push('giveaway');
    }

    if (local.wordBooks && upstream.wordBooks) {
      let coverFixes = 0;
      for (const [word, book] of Object.entries(local.wordBooks)) {
        if (!book || typeof book.cover !== 'string' || !book.cover) continue;
        const up = upstream.wordBooks[word];
        if (!up || up.cover === book.cover) continue;
        up.cover = book.cover;
        coverFixes += 1;
      }
      if (coverFixes) parts.push(`covers:${coverFixes}`);
    }

    if (!parts.length) return { body, parts };
    return { body: JSON.stringify(upstream), parts };
  } catch (e) {
    console.error('[booky-words] local overlay skipped:', e && e.message);
    return { body, parts: [] };
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
      // Upstream is down. On 2026-08-04 the whole booky-deploy project started
      // 404ing (even its root) and the game went dead: every player saw
      // "Couldn't load today's word". A 502 here is a total outage for a daily
      // game, so serve this repo's copy instead of nothing.
      return serveLocal(res, `upstream-${r.status}`);
    }
    const upstreamBody = await r.text();
    const { body, parts } = withLocalOverlays(upstreamBody);
    const tag = parts.length
      ? `proxy-booky-deploy+${parts.join('+')}`
      : 'proxy-booky-deploy';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Booky-Words', tag);
    res.setHeader('X-Booky-Build', 'restored-2026-08-06');
    res.status(200).send(body);
  } catch (e) {
    return serveLocal(res, 'upstream-error');
  }
};

// Last-resort source: this repo's booky/words.json. The queue is normally owned
// upstream, but a stale word beats a broken game, and the local copy is kept in
// sync well enough that it produced the correct word on the day this was added.
// X-Booky-Words says `local-fallback:<reason>` so the health check can alert.
function serveLocal(res, reason) {
  try {
    const body = fs.readFileSync(LOCAL_WORDS, 'utf8');
    JSON.parse(body); // never serve a corrupt file
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Booky-Words', `local-fallback:${reason}`);
    res.setHeader('X-Booky-Build', 'restored-2026-08-06');
    res.status(200).send(body);
  } catch (err) {
    console.error('[booky-words] local fallback failed:', err && err.message);
    res.status(502).json({ error: 'upstream and local words.json both failed', reason });
  }
}

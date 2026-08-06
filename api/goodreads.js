// Vercel serverless function: server-side Goodreads RSS proxy
// Eliminates CORS issues by fetching from the server instead of the browser.
//
// Usage:  /api/goodreads?userId=84782638&shelf=read&page=1&per_page=200

module.exports = async (req, res) => {
  const { userId, shelf = 'read', page = '1', per_page = '200' } = req.query || {};

  // Validate userId — must be numeric digits only
  if (!userId || !/^\d+$/.test(String(userId))) {
    res.status(400).json({ error: 'Invalid or missing userId. Must be numeric.' });
    return;
  }

  // Validate shelf
  const allowedShelves = ['read', 'currently-reading', 'to-read', '#ALL#', 'favorites'];
  if (!allowedShelves.includes(shelf)) {
    res.status(400).json({ error: 'Invalid shelf.' });
    return;
  }

  // Validate numeric params
  const pageNum = parseInt(page, 10);
  const perPageNum = parseInt(per_page, 10);
  if (isNaN(pageNum) || pageNum < 1 || pageNum > 100) {
    res.status(400).json({ error: 'Invalid page.' });
    return;
  }
  if (isNaN(perPageNum) || perPageNum < 1 || perPageNum > 200) {
    res.status(400).json({ error: 'Invalid per_page.' });
    return;
  }

  const grUrl = `https://www.goodreads.com/review/list_rss/${encodeURIComponent(userId)}` +
                `?shelf=${encodeURIComponent(shelf)}&per_page=${perPageNum}&page=${pageNum}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const grResp = await fetch(grUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 90booksBot/1.0; +https://90books.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeout);

    if (!grResp.ok) {
      res.status(grResp.status).json({
        error: `Goodreads returned ${grResp.status}`,
      });
      return;
    }

    const text = await grResp.text();

    // Sanity check — must look like RSS XML
    if (!text || (!text.includes('<rss') && !text.includes('<item>'))) {
      res.status(502).json({ error: 'Goodreads returned unexpected response' });
      return;
    }

    // Cache for 5 minutes at edge, 1 minute in browser, stale-while-revalidate for 10 min
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=60, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch from Goodreads',
      message: err && err.message ? err.message : String(err),
    });
  }
};

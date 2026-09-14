# Harvesting a corpus for word scoring

Reddit and TikTok are blocked from the in-app browser and from curl (403). They
work through `mcp__claude-in-chrome__` on Olga's own logged-in Chrome.

Two corpora are needed, and the **baseline is what makes the score mean
anything**. Without it you are back to counting, and counting alone says GLADE
is a great ACOTAR word because fantasy readers say "glade" a lot.

## 1. Baseline — romantasy in general

Harvest r/fantasyromance and r/Romantasy, top + hot, with comments. Save once
and reuse for months; genre vocabulary moves slowly. Refresh a couple of times
a year.

    corpus/romantasy-baseline.txt

## 2. The book's own fandom

The book's dedicated sub if it has one, otherwise sitewide search on the title
plus the two lead character names.

⚠️ **Check the sub actually exists at the name you expect.** r/CrescentCity
redirects to r/crescentcitysjm, and the redirect wipes `window.*` mid-harvest,
which silently cost two runs before anyone noticed.

## The snippet

Paste into the tab's console via `javascript_tool`. Kick it off async and poll
`window.__done` — a long loop blows the 45s CDP timeout.

```js
window.__t=''; window.__done=false; window.__n=0;
window.__go = async () => {
  const s = m => new Promise(r => setTimeout(r, m));
  const seen = new Set(); const posts = [];
  const feeds = [['/r/SUBNAME','top','t=all'], ['/r/SUBNAME','top','t=year'], ['/r/SUBNAME','hot','']];
  for (const f of feeds) {
    let after = '';
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`${f[0]}/${f[1]}.json?limit=100&${f[2]}&after=${after}`, {credentials:'include'});
      if (!r.ok) break;
      const j = await r.json();
      j.data.children.forEach(c => { if (!seen.has(c.data.id)) { seen.add(c.data.id);
        posts.push({id:c.data.id, t:c.data.title, b:c.data.selftext||''}); } });
      after = j.data.after; if (!after) break; await s(380);
    }
  }
  window.__n = posts.length;
  let txt = posts.map(p => p.t + ' ' + p.b).join(' ');
  // comments are the point: posts are one person picking a title,
  // the replies are dozens of readers using the words they think in
  for (const p of posts.slice(0, 110)) {
    const r = await fetch(`/comments/${p.id}.json?limit=400`, {credentials:'include'});
    if (r.ok) { const j = await r.json();
      const walk = n => { if (!n) return;
        ((n.data && n.data.children) || []).forEach(c => {
          if (c.data && c.data.body) txt += ' ' + c.data.body;
          if (c.data && c.data.replies) walk(c.data.replies); }); };
      walk(j[1]); }
    await s(240);
  }
  window.__t = txt; window.__done = true;
};
window.__go(); 'started'
```

Then read `window.__t` back in chunks and write it to `corpus/<name>.txt`.

## TikTok and Instagram

Neither returns usable text: TikTok is canvas video, Instagram needs each post
opened. Screenshot them and read overlay text by eye. They do not feed the
score, they corroborate it, and Instagram is the best of the three at showing
which EDITION and cover readers are excited about.

## Then score

    python3 scripts/wordlab/score_words.py \
      --book corpus/acotar.txt \
      --baseline corpus/romantasy-baseline.txt \
      --title "A Court of Thorns and Roses"

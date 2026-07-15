// Vercel Edge Middleware, per-URL SEO meta tags.
//
// The site is a SPA (one index.html serving every route via Vercel rewrites).
// Google indexes whatever HTML it sees in the FIRST response, and renders JS
// only sometimes. So we intercept the response for /books-like/[slug],
// /genre/[slug], and /mood/[slug] and rewrite <title>, <meta description>,
// <meta og:*>, <meta twitter:*> + canonical link inline. Same JS bundle ships
// after; client-side updateSectionMeta still works for soft-nav.
//
// Bonus: also injects a JSON-LD ItemList describing the page so Google can
// build rich snippets ("Books Like Fourth Wing, list of 8 books").

import { next } from '@vercel/edge';
import { BOOKS_LIKE_RECS } from './seo-recs.mjs';

// Read the Booky shelf (unique books, deduped by slug) from the Booky-owned
// booky/words.json at runtime. We READ this file, never write it (chat
// boundary). Fetched the same way we fetch index.html below, so the list
// auto-updates whenever the Booky side adds a book.
async function getLibraryBooks(origin) {
  try {
    const r = await fetch(`${origin}/booky/words.json`, {
      headers: { 'user-agent': '90books-edge-middleware' },
    });
    if (!r.ok) return [];
    const data = await r.json();
    const wb = data.wordBooks || {};
    const bySlug = {};
    for (const w in wb) {
      const b = wb[w];
      if (b && b.slug && !bySlug[b.slug]) bySlug[b.slug] = b;
    }
    return Object.values(bySlug); // ~26 { slug, title, author, cover, buyUrl }
  } catch (e) {
    return [];
  }
}

export const config = {
  matcher: ['/books-like/:slug*', '/genre/:slug*', '/mood/:slug*', '/booky-library'],
};

// Canonical capitalisation for our most-trafficked slugs. Anything not here
// falls back to a generic title-case conversion.
const BOOK_TITLES = {
  'fourth-wing': 'Fourth Wing',
  'iron-flame': 'Iron Flame',
  'crescent-city': 'Crescent City',
  'a-court-of-thorns-and-roses': 'A Court of Thorns and Roses',
  'it-ends-with-us': 'It Ends With Us',
  'verity': 'Verity',
  'the-seven-husbands-of-evelyn-hugo': 'The Seven Husbands of Evelyn Hugo',
  'the-song-of-achilles': 'The Song of Achilles',
  'the-midnight-library': 'The Midnight Library',
  'gone-girl': 'Gone Girl',
  'from-blood-and-ash': 'From Blood and Ash',
  'powerless': 'Powerless',
  'quicksilver': 'Quicksilver',
  'the-cruel-prince': 'The Cruel Prince',
  'six-of-crows': 'Six of Crows',
  'twisted-love': 'Twisted Love',
  'haunting-adeline': 'Haunting Adeline',
  'king-of-wrath': 'King of Wrath',
  'icebreaker': 'Icebreaker',
  'funny-story': 'Funny Story',
  'the-love-hypothesis': 'The Love Hypothesis',
  'the-summer-i-turned-pretty': 'The Summer I Turned Pretty',
  'the-silent-patient': 'The Silent Patient',
  'the-woman-in-cabin-10': 'The Woman in Cabin 10',
  'a-good-girls-guide-to-murder': "A Good Girl's Guide to Murder",
  'twilight': 'Twilight',
  'the-housemaid': 'The Housemaid',
  'happy-place': 'Happy Place',
  'book-lovers': 'Book Lovers',
  'the-invisible-life-of-addie-larue': 'The Invisible Life of Addie LaRue',
  'eleanor-oliphant-is-completely-fine': 'Eleanor Oliphant Is Completely Fine',
  'one-dark-window': 'One Dark Window',
  'the-risk': 'The Risk',
  'mile-high': 'Mile High',
  'heartless-hunter': 'Heartless Hunter',
  'the-jasad-heir': 'The Jasad Heir',
  'the-bridge-kingdom': 'The Bridge Kingdom',
};

const GENRE_LABELS = {
  'romantasy': 'Romantasy',
  'fantasy': 'Fantasy',
  'romance': 'Romance',
  'thriller': 'Thriller & Mystery',
  'sci-fi': 'Sci-Fi',
  'literary': 'Literary Fiction',
};

const MOOD_LABELS = {
  'dark':        'Dark',
  'swoony':      'Swoony',
  'cozy':        'Cozy',
  'emotional':   'Emotional',
  'hopeful':     'Hopeful',
  'adventurous': 'Adventurous',
  'mysterious':  'Mysterious',
  'funny':       'Funny',
  'reflective':  'Reflective',
  'shocking':    'Shocking',
  'sad':         'Sad',
  'tense':       'Tense',
};

function slugToTitle(slug) {
  const lowerWords = new Set(['a','an','the','of','and','or','to','in','on','for','with','by']);
  return slug.split('-').map((w, i) => {
    if (i > 0 && lowerWords.has(w.toLowerCase())) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Universal "how recs work" FAQ, appended to every books-like page's FAQ block
// (visible + FAQPage JSON-LD). Mirrors the in-app "How these picks are chosen" note.
const HOW_CHOSEN_FAQ = {
  q: 'How are these book recommendations chosen?',
  a: "It starts with what romantasy readers actually recommend to each other, the books that come up again and again in Reddit threads (r/Romantasy, r/fantasyromance), Goodreads 'readers also enjoyed,' and BookTok. For popular titles those lists are hand-curated with a reason for each pick; for everything else, 90books matches on tropes, pace, spice and vibe. Connect your Goodreads and books you've already read get filtered out. Affiliate buy links support the site but never affect which books are recommended.",
};

function buildMeta(pathname) {
  let m;
  if (pathname === '/booky-library' || pathname === '/booky-library/') {
    return {
      title: 'The Booky Library | Every romantasy book from Booky by 90books',
      description: "Browse every romantasy book featured in Booky, the daily romantasy word game. Hand-picked fantasy romance, enemies to lovers, fae, dragons, and more. Start your want-to-read list.",
      canonical: 'https://90books.com/booky-library',
      pageKind: 'library',
      label: 'The Booky Library',
    };
  }
  if ((m = pathname.match(/^\/books-like\/([^\/]+)\/?$/))) {
    const slug = m[1];
    const bookTitle = BOOK_TITLES[slug] || slugToTitle(slug);
    // Some books have widely-used abbreviations (ACOTAR, TOG, FBAA, etc.). When
    // present, weave them into the title and meta so the page ranks for both
    // the full title AND the abbreviation. We don't create separate URLs for
    // the abbreviations, that would be duplicate content. Instead, we 301
    // redirect /books-like/acotar (etc.) to the canonical URL (vercel.json).
    // Map of widely-used abbreviations. Only include slugs where we have full
    // SEO content (otherwise we'd promise the abbreviation in title but deliver
    // a thin page). Each entry should also have a 301 alias in vercel.json.
    const BOOK_ALIASES = {
      'a-court-of-thorns-and-roses': 'ACOTAR',
      'from-blood-and-ash': 'FBAA',
      'a-good-girls-guide-to-murder': 'AGGGTM',
      'house-of-earth-and-blood': 'Crescent City',
    };
    const alias = BOOK_ALIASES[slug];
    const titleStr = alias
      ? `Books Like ${bookTitle} (${alias}) | 90books`
      : `Books Like ${bookTitle} | 90books`;
    const descStr = alias
      ? `If you loved ${bookTitle} (${alias}), you'll love these. Curated recommendations from real readers, cross-referenced against Reddit. No algorithms.`
      : `If you loved ${bookTitle}, you'll love these. Curated recommendations from real readers, cross-referenced against Reddit. No algorithms.`;
    return {
      title: titleStr,
      description: descStr,
      canonical: `https://90books.com/books-like/${slug}`,
      pageKind: 'books-like',
      label: alias ? `${bookTitle} (${alias})` : bookTitle,
    };
  }
  if ((m = pathname.match(/^\/genre\/([^\/]+)\/?$/))) {
    const slug = m[1];
    const genre = GENRE_LABELS[slug] || slugToTitle(slug);
    // Romantasy gets bespoke copy because it's the flagship genre.
    if (slug === 'romantasy') {
      return {
        title: 'Romantasy Books, The Best Reads for 2026 | 90books',
        description: 'The best romantasy books real readers can\'t stop recommending. Fourth Wing, ACOTAR, Quicksilver, and every breakout the r/Romantasy community is binging. Curated, not algorithmic.',
        canonical: `https://90books.com/genre/${slug}`,
        pageKind: 'genre',
        label: genre,
      };
    }
    return {
      title: `${genre} Books | 90books`,
      description: `The best ${genre.toLowerCase()} books real readers can't stop recommending. Hand-picked, cross-referenced against Reddit threads.`,
      canonical: `https://90books.com/genre/${slug}`,
      pageKind: 'genre',
      label: genre,
    };
  }
  if ((m = pathname.match(/^\/mood\/([^\/]+)\/?$/))) {
    const slug = m[1];
    const mood = MOOD_LABELS[slug] || slugToTitle(slug);
    return {
      title: `${mood} Books | 90books`,
      description: `Books for when you're in the mood for something ${mood.toLowerCase()}. Curated picks readers come back to.`,
      canonical: `https://90books.com/mood/${slug}`,
      pageKind: 'mood',
      label: mood,
    };
  }
  return null;
}

// SEO body block, visible to Googlebot before JS hydrates, hidden from
// users once the SPA takes over. The SPA looks for #seo-static-block and
// removes it on initDiscoverTab (added to the home init flow).
function buildSeoBlock(meta, books) {
  const safeLabel = escapeHtml(meta.label);
  let h1Text, bodyHtml;

  if (meta.pageKind === 'books-like') {
    h1Text = `Books Like ${safeLabel}`;

    // Look up curated rec data for this page. If present, render the full
    // SEO-optimised block (1500+ words of unique content per page). Otherwise
    // fall back to the basic block, still better than nothing.
    const slug = meta.canonical.split('/').pop();
    const data = BOOKS_LIKE_RECS[slug];

    if (data) {
      const recsHtml = data.recs.map((r, i) => {
        const t = escapeHtml(r.title);
        const a = escapeHtml(r.author);
        const w = escapeHtml(r.why);
        const tSlug = r.title.toLowerCase()
          .replace(/'/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        // Amazon affiliate link, tag=90books-20.
        // Prefers direct product page (/dp/<isbn>) when seo-recs.mjs supplies
        // an ISBN for the rec; falls back to a books-category search otherwise.
        // rel="nofollow sponsored" per Amazon TOS + Google's affiliate guidance.
        const amazonUrl = r.isbn
          ? `https://www.amazon.com/dp/${encodeURIComponent(r.isbn)}/?tag=90books-20`
          : `https://www.amazon.com/s?k=${encodeURIComponent(r.title + ' ' + r.author)}&i=stripbooks&tag=90books-20`;
        return `<article>
        <h3 style="font-family:'Playfair Display',serif;font-size:1.25rem;margin:24px 0 6px;">${i + 1}. <a href="/books-like/${tSlug}" style="color:inherit;text-decoration:none;">${t}</a></h3>
        <p style="margin:0 0 4px;color:#555;font-size:0.95rem;">by ${a}</p>
        <p style="margin:0 0 12px;line-height:1.55;">${w}</p>
        <p style="margin:0 0 8px;"><a href="${amazonUrl}" rel="nofollow sponsored" target="_blank" onclick="window.trackAffiliateClick&&window.trackAffiliateClick('${t.replace(/'/g, "\\'")}','amazon')" style="display:inline-flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;padding:12px 22px;border-radius:12px;background:#1A1A1A;color:#fff;text-decoration:none;">Buy on Amazon →</a></p>
      </article>`;
      }).join('');

      const faqsHtml = [...data.faqs, HOW_CHOSEN_FAQ].map(f => `<details style="margin:10px 0;border:1px solid #e5e5e5;border-radius:8px;padding:12px 16px;">
        <summary style="font-weight:600;cursor:pointer;">${escapeHtml(f.q)}</summary>
        <p style="margin:8px 0 0;line-height:1.55;">${escapeHtml(f.a)}</p>
      </details>`).join('');

      bodyHtml = `
      <p style="line-height:1.6;font-size:1.05rem;margin-bottom:24px;">${escapeHtml(data.sourceAbout)}</p>

      <h2 style="font-family:'Playfair Display',serif;font-size:1.5rem;margin:32px 0 8px;">${data.recs.length} books like ${safeLabel}</h2>
      <p style="color:#666;margin-bottom:6px;">Curated from real reader threads on Reddit (r/Romantasy, r/RomanceBooks, r/Fantasy) and cross-referenced against Goodreads and BookTok. Updated regularly.</p>
      <p style="color:#999;font-size:0.78rem;margin:0 0 20px;font-style:italic;">As an Amazon Associate, 90books earns from qualifying purchases.</p>
      ${recsHtml}

      <h2 style="font-family:'Playfair Display',serif;font-size:1.5rem;margin:40px 0 12px;">Frequently asked questions</h2>
      ${faqsHtml}

      <!-- Booky callout, middle-of-page hook so Reddit traffic loops back into
           the daily game. Pinned only on books-like pages (highest-intent surface). -->
      <a href="/booky" style="display:block;margin:40px 0 24px;padding:20px 22px;background:linear-gradient(135deg,#3D0070 0%,#8400E7 100%);color:#fff;text-decoration:none;border-radius:14px;font-family:'Inter',sans-serif;box-shadow:0 6px 20px rgba(132,0,231,0.18);">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <div style="font-size:34px;line-height:1;">🎮</div>
          <div style="flex:1;min-width:200px;">
            <div style="font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;margin-bottom:4px;">Play Booky, the daily romantasy word game</div>
            <div style="font-size:0.95rem;opacity:0.92;line-height:1.45;">Guess today's romantasy in 6 tries. New book every day. Build your streak.</div>
          </div>
          <div style="font-size:1.4rem;line-height:1;opacity:0.85;">→</div>
        </div>
      </a>

      <p style="margin-top:24px;color:#666;font-size:0.9rem;">Want personalised picks? Connect your Goodreads to filter out books you\'ve already read and get recommendations tuned to your taste.</p>
    `;
    } else {
      bodyHtml = `<p>Looking for books like <strong>${safeLabel}</strong>? Here are reader-recommended picks, curated from real Reddit threads, Goodreads ratings, and BookTok consensus. Each pick links to similar books across romantasy, romance, fantasy, and thrillers.</p>`;
    }
  } else if (meta.pageKind === 'genre') {
    h1Text = `${safeLabel} Books`;
    bodyHtml = `<p>The best <strong>${safeLabel.toLowerCase()}</strong> books real readers can't stop recommending. Hand-picked rather than algorithmically generated, with picks cross-referenced against Reddit reader threads.</p>`;
  } else if (meta.pageKind === 'mood') {
    h1Text = `${safeLabel} Books`;
    bodyHtml = `<p>Books for when you're in the mood for something <strong>${safeLabel.toLowerCase()}</strong>. Curated picks from real reader threads, no algorithm slop.</p>`;
  } else if (meta.pageKind === 'library') {
    const count = (books && books.length) || 0;
    h1Text = 'The Booky Library';
    const items = (books || []).map((b) => {
      const t = escapeHtml(b.title);
      const a = escapeHtml(b.author);
      return `<li style="margin:0 0 10px;line-height:1.5;"><strong>${t}</strong> by ${a}</li>`;
    }).join('');
    bodyHtml = `
      <p style="line-height:1.6;font-size:1.05rem;margin-bottom:20px;">Every romantasy book we have featured in Booky, the daily romantasy word game. ${count} hand-picked reader favorites from r/Romantasy and BookTok, a new one every day since May 2026. Find your next obsession, then go guess today's word.</p>
      <p style="margin:0 0 28px;"><a href="/booky" style="display:inline-flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;font-size:15px;font-weight:700;padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#3D0070 0%,#8400E7 100%);color:#fff;text-decoration:none;">Play today's romantasy word →</a></p>
      <h2 style="font-family:'Playfair Display',serif;font-size:1.5rem;margin:0 0 12px;">${count} romantasy books featured in Booky</h2>
      <ul style="list-style:none;padding:0;margin:0;">${items}</ul>`;
  } else {
    return '';
  }

  return `<div id="seo-static-block" style="max-width:760px;margin:0 auto;padding:40px 20px;font-family:'Inter',sans-serif;color:#1A1A1A;line-height:1.5;">
    <h1 style="font-family:'Playfair Display',serif;font-size:2.2rem;margin:0 0 16px;line-height:1.15;">${h1Text}</h1>
    ${bodyHtml}
  </div>`;
}

function jsonLd(meta, books) {
  // CollectionPage with about reference, tells Google "this is a curated list
  // of recommendations related to <BOOK NAME>". Rich snippets eligible.
  const base = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title.replace(' | 90books', ''),
    description: meta.description,
    url: meta.canonical,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: '90books', url: 'https://90books.com' },
  };
  if (meta.pageKind === 'books-like') {
    base.about = { '@type': 'Book', name: meta.label };
    // If we have curated rec data, expose the recs as an ItemList for Google
    // and FAQs as an FAQPage section. Both are rich-snippet eligible.
    const slug = meta.canonical.split('/').pop();
    const data = BOOKS_LIKE_RECS[slug];
    if (data) {
      base.mainEntity = {
        '@type': 'ItemList',
        numberOfItems: data.recs.length,
        itemListElement: data.recs.map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Book',
            name: r.title,
            author: { '@type': 'Person', name: r.author },
          },
        })),
      };
      base.hasPart = {
        '@type': 'FAQPage',
        mainEntity: [...(data.faqs || []), HOW_CHOSEN_FAQ].map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      };
    }
  }
  if (meta.pageKind === 'library' && books && books.length) {
    base.mainEntity = {
      '@type': 'ItemList',
      numberOfItems: books.length,
      itemListElement: books.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Book',
          name: b.title,
          author: { '@type': 'Person', name: b.author },
        },
      })),
    };
  }
  return base;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const meta = buildMeta(url.pathname);
  if (!meta) return next();

  // Fetch the static index.html
  const origin = url.origin;
  let res;
  try {
    res = await fetch(`${origin}/index.html`, { headers: { 'user-agent': '90books-edge-middleware' } });
  } catch (e) {
    return next();
  }
  if (!res.ok) return next();
  let html = await res.text();

  // The Booky Library lists the real game shelf (read from booky/words.json).
  let libraryBooks = [];
  if (meta.pageKind === 'library') {
    libraryBooks = await getLibraryBooks(origin);
  }

  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const c = escapeHtml(meta.canonical);

  // Replace existing meta tags (set on the homepage HTML) with per-URL values
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${d}">`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${t}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${d}">`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${c}">`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${t}">`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${d}">`)
    // Replace the homepage canonical link (rather than appending, avoids
    // duplicate canonicals which Google ignores or flags).
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${c}">`);

  // Inject JSON-LD just before </head> (canonical was handled above)
  const ld = JSON.stringify(jsonLd(meta, libraryBooks));
  html = html.replace(/<\/head>/i, `  <script type="application/ld+json">${ld}</script>\n</head>`);

  // Inject a static SEO block at the start of <body> so Googlebot sees the
  // page's H1 + description even on first-crawl (when JS hasn't rendered yet).
  // The block is hidden from real users via JS on load (the SPA hides it
  // when it takes over). For Google: indexable. For users: a brief skeleton
  // they barely see before the SPA replaces the page.
  const seoBlock = buildSeoBlock(meta, libraryBooks);
  html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${seoBlock}`);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Browser revalidates every load; CDN serves instantly but refreshes
      // within 60s. Prevents a just-deployed/curated page from serving a stale
      // SPA shell (which would fall back to the homepage under the right URL).
      'cache-control': 'public, max-age=0, must-revalidate, s-maxage=60, stale-while-revalidate=86400',
      'x-edge-middleware': '90books-seo',
    },
  });
}

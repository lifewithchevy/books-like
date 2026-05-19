// Vercel Edge Middleware — per-URL SEO meta tags.
//
// The site is a SPA (one index.html serving every route via Vercel rewrites).
// Google indexes whatever HTML it sees in the FIRST response — and renders JS
// only sometimes. So we intercept the response for /books-like/[slug],
// /genre/[slug], and /mood/[slug] and rewrite <title>, <meta description>,
// <meta og:*>, <meta twitter:*> + canonical link inline. Same JS bundle ships
// after; client-side updateSectionMeta still works for soft-nav.
//
// Bonus: also injects a JSON-LD ItemList describing the page so Google can
// build rich snippets ("Books Like Fourth Wing — list of 8 books").

import { next } from '@vercel/edge';

export const config = {
  matcher: ['/books-like/:slug*', '/genre/:slug*', '/mood/:slug*'],
};

// Canonical capitalisation for our most-trafficked slugs. Anything not here
// falls back to a generic title-case conversion.
const BOOK_TITLES = {
  'fourth-wing': 'Fourth Wing',
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

function buildMeta(pathname) {
  let m;
  if ((m = pathname.match(/^\/books-like\/([^\/]+)\/?$/))) {
    const slug = m[1];
    const bookTitle = BOOK_TITLES[slug] || slugToTitle(slug);
    return {
      title: `Books Like ${bookTitle} | 90books`,
      description: `If you loved ${bookTitle}, you'll love these. Curated recommendations from real readers, cross-referenced against Reddit. No algorithms.`,
      canonical: `https://90books.com/books-like/${slug}`,
      pageKind: 'books-like',
      label: bookTitle,
    };
  }
  if ((m = pathname.match(/^\/genre\/([^\/]+)\/?$/))) {
    const slug = m[1];
    const genre = GENRE_LABELS[slug] || slugToTitle(slug);
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

function jsonLd(meta) {
  // CollectionPage with about reference — tells Google "this is a curated list
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
    // Replace the homepage canonical link (rather than appending — avoids
    // duplicate canonicals which Google ignores or flags).
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${c}">`);

  // Inject JSON-LD just before </head> (canonical was handled above)
  const ld = JSON.stringify(jsonLd(meta));
  html = html.replace(/<\/head>/i, `  <script type="application/ld+json">${ld}</script>\n</head>`);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
      'x-edge-middleware': '90books-seo',
    },
  });
}

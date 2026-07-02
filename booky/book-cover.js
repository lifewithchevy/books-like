// Shared book cover resolution — single source for game, promo, and previews.
// Priority: words.json cover → local asset → canonical slug fallback.
(function (global) {
  const SLUG_COVER_FALLBACK = {
    'weavingshaw': '/booky/assets/weavingshaw.jpg',
    'fourth-wing': 'https://images-na.ssl-images-amazon.com/images/P/1649374046.01.LZZZZZZZ.jpg',
    'from-blood-and-ash': 'https://images-na.ssl-images-amazon.com/images/P/1635575567.01.LZZZZZZZ.jpg',
    'a-court-of-thorns-and-roses': 'https://images-na.ssl-images-amazon.com/images/P/1619630346.01.LZZZZZZZ.jpg',
    'house-of-earth-and-blood': 'https://images-na.ssl-images-amazon.com/images/P/1649374178.01.LZZZZZZZ.jpg',
    'gild': 'https://images-na.ssl-images-amazon.com/images/P/1464224416.01.LZZZZZZZ.jpg',
    'quicksilver': 'https://images-na.ssl-images-amazon.com/images/P/1538774194.01.LZZZZZZZ.jpg',
    'the-cruel-prince': 'https://images-na.ssl-images-amazon.com/images/P/0316310271.01.LZZZZZZZ.jpg',
    'throne-of-glass': 'https://images-na.ssl-images-amazon.com/images/P/1635575595.01.LZZZZZZZ.jpg',
  };

  function coverUrlsForBook(book) {
    if (!book) return [];
    const seen = new Set();
    const out = [];
    const add = (url) => {
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    };
    add(book.cover);
    if (book.slug) add(`/booky/assets/${book.slug}.jpg`);
    if (book.slug) add(SLUG_COVER_FALLBACK[book.slug]);
    return out;
  }

  function applyBookCover(img, book) {
    if (!img || !book) return;
    const urls = coverUrlsForBook(book);
    if (!urls.length) {
      img.hidden = true;
      img.removeAttribute('src');
      return;
    }
    let i = 0;
    img.alt = `${book.title} cover`;
    img.hidden = false;
    const tryNext = () => {
      if (i >= urls.length) {
        img.hidden = true;
        return;
      }
      img.src = urls[i++];
    };
    img.onerror = tryNext;
    tryNext();
  }

  function primaryCoverUrl(book) {
    const urls = coverUrlsForBook(book);
    return urls[0] || '';
  }

  global.BookyCover = { coverUrlsForBook, applyBookCover, primaryCoverUrl };
})(typeof window !== 'undefined' ? window : globalThis);

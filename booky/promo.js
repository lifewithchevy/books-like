// Author promo graphic — same frame as the Booky win screen.
// Usage:
//   /booky/promo              today's featured book (if any)
//   /booky/promo?day=42       puzzle day number
//   /booky/promo?book=weavingshaw   by book slug
//   /booky/promo?format=story       taller layout for IG stories

const $ = (id) => document.getElementById(id);

function computeDayNumber(epochStr) {
  const [y, m, d] = epochStr.split('-').map(Number);
  const epochLocal = new Date(y, m - 1, d, 0, 0, 0).getTime();
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
  return Math.floor((todayLocal - epochLocal) / 86_400_000) + 1;
}

function findDayBySlug(data, slug) {
  const target = slug.toLowerCase();
  for (let i = 0; i < data.queue.length; i++) {
    const word = data.queue[i];
    const book = data.wordBooks?.[word];
    if (book?.slug === target) return { day: i + 1, word, book };
  }
  return null;
}

function showError(msg) {
  $('promo-card').hidden = true;
  const err = $('promo-error');
  err.textContent = msg;
  err.hidden = false;
}

(async function init() {
  const params = new URLSearchParams(location.search);
  if (params.get('format') === 'story') {
    document.body.classList.add('promo-page--story');
  }

  let data;
  try {
    data = await fetch('/booky/words.json?v=6', { cache: 'no-store' }).then((r) => r.json());
  } catch {
    showError('Could not load book data.');
    return;
  }

  const dayParam = params.get('day');
  const slugParam = params.get('book');
  let day;
  let word;
  let book;

  if (dayParam) {
    day = parseInt(dayParam, 10);
    if (!Number.isFinite(day) || day < 1 || day > data.queue.length) {
      showError(`Day ${dayParam} is not in the puzzle queue.`);
      return;
    }
    word = data.queue[day - 1];
    book = data.wordBooks?.[word];
  } else if (slugParam) {
    const hit = findDayBySlug(data, slugParam);
    if (!hit) {
      showError(`No puzzle found for book slug "${slugParam}".`);
      return;
    }
    ({ day, word, book } = hit);
  } else {
    day = computeDayNumber(data.epoch);
    if (day < 1 || day > data.queue.length) {
      showError('No puzzle scheduled for today.');
      return;
    }
    word = data.queue[day - 1];
    book = data.wordBooks?.[word];
  }

  if (!book) {
    showError(`Day ${day} (${word}) has no book linked in wordBooks.`);
    return;
  }

  $('promo-teaser').textContent = 'today\u2019s word is hidden in\u2026';
  $('promo-title').textContent = book.title;
  $('promo-author').textContent = book.author;

  const cover = $('promo-cover');
  if (book.cover) {
    cover.src = book.cover;
    cover.alt = `${book.title} cover`;
    cover.onerror = () => { cover.hidden = true; };
  } else {
    cover.hidden = true;
  }

  const utm = new URLSearchParams({
    utm_source: 'author_promo',
    utm_medium: 'social',
    utm_campaign: book.slug || `day-${day}`,
  });
  $('promo-cta').href = `https://90books.com/booky?${utm}`;

  document.title = `Booky — ${book.title}`;
  $('promo-card').hidden = false;
})();

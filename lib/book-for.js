// Which book does `word` mean on day number `day`?
//
// `wordBooks[word]` is the default and is what every past play uses.
// `wordBooksFrom[word]` is an optional list of `{ from: 'YYYY-MM-DD', ...book }`
// entries: from that date on the word means a different book, so a word can be
// re-run for another series without rewriting any earlier day or the archive.
// The latest entry whose `from` is on or before the day's date wins; a day
// before every `from` keeps the default.
//
// Day 1 is `epoch`; the date is computed in UTC so it cannot drift with the
// machine's timezone. booky/app.js and booky/archive/index.html carry a
// byte-identical copy of this function (they are plain scripts and cannot
// require it); scripts/validate_book_history.py fails if the three disagree.
function bookFor(data, word, day) {
  const base = (data && data.wordBooks && data.wordBooks[word]) || null;
  const alts = data && data.wordBooksFrom && data.wordBooksFrom[word];
  if (!alts || !alts.length || !data.epoch) return base;
  const p = String(data.epoch).split('-').map(Number);
  const iso = new Date(Date.UTC(p[0], p[1] - 1, p[2] + day - 1)).toISOString().slice(0, 10);
  let pick = base;
  let best = '';
  for (const a of alts) {
    if (a && a.from && a.from <= iso && a.from >= best) { pick = a; best = a.from; }
  }
  return pick;
}

module.exports = { bookFor };

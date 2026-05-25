// Booky — Wordle-style daily romantasy book guessing game.
// Single static page. No backend. LocalStorage only.
//
// Note: LocalStorage keys keep the `_daily_` prefix from the pre-rename era
// so existing user streaks/stats survive. Don't rename them without a
// migration; users would lose their history.

const MAX_GUESSES = 6;
const STATE_KEY = '90books_daily_state_v1';
const STATS_KEY = '90books_daily_stats_v1';
const SITE_URL = '90books.com/booky';

// Clue reveal order: medium → hard → easy. Cover de-blurs across clues 3→6.
// Quotes graded hard → medium → easy so the iconic line lands on guess 6.
const CLUE_ORDER = ['trope', 'spiceYear', 'cover', 'quoteHard', 'quoteMedium', 'quoteEasy'];

let DATA = null;
let BOOK = null;
let DAY = null;
let STATE = null;
let STATS = null;

const $ = (id) => document.getElementById(id);

(async function init() {
  try {
    DATA = await fetch('/booky/books.json', { cache: 'no-store' }).then(r => r.json());
  } catch {
    return showFatal("Couldn't load today's book. Try refreshing.");
  }

  DAY = computeDayNumber(DATA.epoch);
  if (DAY < 1 || DAY > DATA.queue.length) {
    return showFatal(DAY < 1
      ? "Booky hasn't launched yet — come back soon!"
      : 'Out of books in the queue — new ones loading soon!');
  }
  BOOK = DATA.queue[DAY - 1];

  STATS = loadStats();
  STATE = loadState();
  if (!STATE || STATE.dayNumber !== DAY) {
    STATE = freshState();
    saveState();
  }

  $('day-number').textContent = `Daily · No. ${DAY}`; // "Daily" here is the descriptor, not the brand
  renderTiles();
  bindUI();
  render();

  if (STATE.status !== 'playing') showEndScreen(false);
})();

function computeDayNumber(epochStr) {
  const [y, m, d] = epochStr.split('-').map(Number);
  const epochMs = Date.UTC(y, m - 1, d);
  return Math.floor((Date.now() - epochMs) / 86_400_000) + 1;
}

// ---- State ----

function freshState() {
  return {
    dayNumber: DAY,
    guesses: [],
    status: 'playing',
    revealedCount: 1
  };
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY)); }
  catch { return null; }
}
function saveState() { localStorage.setItem(STATE_KEY, JSON.stringify(STATE)); }

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    if (s && typeof s === 'object') return s;
  } catch {}
  return {
    currentStreak: 0, maxStreak: 0, played: 0, wins: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 },
    lastPlayedDay: 0
  };
}
function saveStats() { localStorage.setItem(STATS_KEY, JSON.stringify(STATS)); }

function recordFinish() {
  if (STATE.statsRecorded) return;
  STATE.statsRecorded = true;
  saveState();

  STATS.played += 1;
  if (STATE.status === 'won') {
    STATS.wins += 1;
    STATS.distribution[STATE.guesses.length] += 1;
    const broken = STATS.lastPlayedDay && (DAY - STATS.lastPlayedDay > 1);
    STATS.currentStreak = broken ? 1 : STATS.currentStreak + 1;
    if (STATS.currentStreak > STATS.maxStreak) STATS.maxStreak = STATS.currentStreak;
  } else {
    STATS.distribution.X += 1;
    STATS.currentStreak = 0;
  }
  STATS.lastPlayedDay = DAY;
  saveStats();
}

// ---- Matching ----

function normalize(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreGuess(text) {
  const g = normalize(text);
  if (!g) return null;
  const titleN = normalize(BOOK.title);
  const aliasN = (BOOK.aliases || []).map(normalize);
  if (g === titleN || aliasN.includes(g)) return 'correct';

  const matched = DATA.queue.find(b => {
    const cands = [normalize(b.title), ...(b.aliases || []).map(normalize)];
    return cands.includes(g);
  });
  if (matched) {
    if (normalize(matched.author) === normalize(BOOK.author)) return 'close';
    if (matched.series && BOOK.series &&
        normalize(matched.series) === normalize(BOOK.series)) return 'close';
  }
  return 'wrong';
}

// ---- Render ----

function renderTiles() {
  const el = $('tiles');
  el.innerHTML = '';
  for (let i = 0; i < MAX_GUESSES; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile empty';
    tile.dataset.idx = i;
    tile.innerHTML = `<span class="tile-dot"></span><span class="tile-text">—</span>`;
    el.appendChild(tile);
  }
}

function render() {
  renderClues();
  paintTiles();
  renderHint();
}

function paintTiles(justRevealedIdx = -1) {
  const tiles = $('tiles').children;
  for (let i = 0; i < MAX_GUESSES; i++) {
    const tile = tiles[i];
    const g = STATE.guesses[i];
    tile.className = 'tile';
    if (g) {
      tile.classList.add('filled', g.result);
      tile.querySelector('.tile-text').textContent = g.text;
      if (i === justRevealedIdx) {
        // restart animation
        tile.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        tile.offsetHeight;
        tile.style.animation = '';
      }
    } else if (i === STATE.guesses.length && STATE.status === 'playing') {
      tile.classList.add('empty', 'active');
      tile.querySelector('.tile-text').textContent = '—';
    } else {
      tile.classList.add('empty');
      tile.querySelector('.tile-text').textContent = '—';
    }
  }
}

function renderClues() {
  const el = $('clues');
  el.innerHTML = '';
  const count = Math.min(STATE.revealedCount, CLUE_ORDER.length);
  for (let i = 0; i < count; i++) el.appendChild(buildClue(CLUE_ORDER[i]));
}

function buildClue(kind) {
  const node = document.createElement('div');
  node.className = 'clue';
  const label = document.createElement('span');
  label.className = 'clue-label';

  switch (kind) {
    case 'trope':
      label.textContent = 'Clue 1 · Trope';
      node.appendChild(label);
      node.appendChild(p(BOOK.clues.trope));
      break;
    case 'spiceYear': {
      label.textContent = 'Clue 2 · Spice & year';
      node.appendChild(label);
      const spice = '🌶️'.repeat(BOOK.clues.spice) || '—';
      node.appendChild(p(`${spice}  ·  Published ${BOOK.clues.year}`));
      break;
    }
    case 'cover': {
      node.classList.add('clue-cover');
      label.textContent = 'Clue 3 · Cover';
      node.appendChild(label);
      const img = document.createElement('img');
      img.src = BOOK.cover;
      img.alt = '';
      img.style.filter = `blur(${currentBlurPx()}px)`;
      // If the cover URL fails (some Kindle-only ASINs), swap to a neutral
      // placeholder so the clue card never looks broken. Generic enough not
      // to spoil the answer.
      img.onerror = () => {
        img.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = 'cover-fallback';
        fallback.innerHTML = '<span>📕</span><small>Cover unavailable</small>';
        node.appendChild(fallback);
      };
      node.appendChild(img);
      break;
    }
    case 'quoteHard':
      label.textContent = 'Clue 4 · Reader quote (hard)';
      node.appendChild(label);
      node.appendChild(quoteEl(BOOK.clues.quotes.hard));
      break;
    case 'quoteMedium':
      label.textContent = 'Clue 5 · Reader quote (medium)';
      node.appendChild(label);
      node.appendChild(quoteEl(BOOK.clues.quotes.medium));
      break;
    case 'quoteEasy':
      label.textContent = 'Clue 6 · Reader quote (easy)';
      node.appendChild(label);
      node.appendChild(quoteEl(BOOK.clues.quotes.easy));
      break;
  }
  return node;
}

function quoteEl(q) {
  const wrap = document.createElement('div');
  const text = document.createElement('p');
  text.className = 'quote-text';
  text.textContent = `"${q.text}"`;
  const attr = document.createElement('p');
  attr.className = 'quote-attr';
  attr.textContent = `via Goodreads · ${q.likes.toLocaleString()} likes`;
  wrap.append(text, attr);
  return wrap;
}

function p(text) {
  const el = document.createElement('p');
  el.textContent = text;
  return el;
}

function currentBlurPx() {
  // Cover appears at revealedCount 3 and de-blurs across rounds 3 → 6.
  const r = STATE.revealedCount;
  if (r >= 6) return 0;
  if (r >= 5) return 5;
  if (r >= 4) return 11;
  return 18;
}

function renderHint() {
  const left = MAX_GUESSES - STATE.guesses.length;
  $('remaining').textContent = STATE.status === 'playing'
    ? `${left} ${left === 1 ? 'guess' : 'guesses'} left`
    : '';
}

// ---- UI binding ----

function bindUI() {
  $('guess-form').addEventListener('submit', onSubmitGuess);
  $('help-btn').addEventListener('click', () => $('help-modal').showModal());
  $('stats-btn').addEventListener('click', () => {
    renderStatsModal();
    $('stats-modal').showModal();
  });
  $('share-btn').addEventListener('click', onShare);
  $('end-modal').querySelector('[data-close-end]').addEventListener('click', (e) => {
    e.preventDefault();
    $('end-modal').close();
  });

  // First-time visitor: show help
  if (!localStorage.getItem('90books_daily_seen_help_v1')) {
    localStorage.setItem('90books_daily_seen_help_v1', '1');
    setTimeout(() => $('help-modal').showModal(), 500);
  }
}

function onSubmitGuess(e) {
  e.preventDefault();
  if (STATE.status !== 'playing') return;
  const input = $('guess-input');
  const raw = input.value.trim();
  if (!raw) return;
  const result = scoreGuess(raw);
  if (result === null) return;

  STATE.guesses.push({ text: raw, result });
  input.value = '';

  if (result === 'correct') {
    STATE.status = 'won';
    STATE.revealedCount = CLUE_ORDER.length;
  } else if (STATE.guesses.length >= MAX_GUESSES) {
    STATE.status = 'lost';
    STATE.revealedCount = CLUE_ORDER.length;
  } else {
    STATE.revealedCount = Math.min(STATE.guesses.length + 1, CLUE_ORDER.length);
  }
  saveState();
  renderClues();
  paintTiles(STATE.guesses.length - 1);
  renderHint();

  if (STATE.status !== 'playing') {
    // Wait for tile flip animation before showing end sheet
    setTimeout(() => showEndScreen(true), 750);
  }
}

// ---- End screen ----

function showEndScreen(animate) {
  recordFinish();

  $('end-headline').textContent = STATE.status === 'won'
    ? `Solved in ${STATE.guesses.length}/${MAX_GUESSES} 🔥`
    : `So close.`;
  $('end-title').textContent = BOOK.title;
  $('end-author').textContent = BOOK.author + (BOOK.series ? ` · ${BOOK.series}` : '');
  $('end-year').textContent = BOOK.clues.year;
  const cover = $('end-cover');
  cover.src = BOOK.cover;
  cover.alt = `${BOOK.title} cover`;
  cover.onerror = () => { cover.style.visibility = 'hidden'; };

  $('buy-amazon').href = BOOK.affiliate?.amazon || '#';
  $('buy-bookshop').href = BOOK.affiliate?.bookshop || '#';
  $('more-like').href = `/books-like/${BOOK.booksLikeSlug || BOOK.slug}`;
  $('share-text').textContent = buildShareString();

  renderStatsModal(); // also seed stats values

  $('end-modal').showModal();
  tickCountdown();
  if (!window.__countdownTicker) {
    window.__countdownTicker = setInterval(tickCountdown, 1000);
  }
}

function buildShareString() {
  const header = `📚 Booky #${DAY}`;
  let scoreLine;
  if (STATE.status === 'won') {
    const streak = STATS.currentStreak > 1 ? ` 🔥${STATS.currentStreak}` : '';
    scoreLine = `${STATE.guesses.length}/${MAX_GUESSES}${streak}`;
  } else {
    scoreLine = `🥀 X/${MAX_GUESSES}`;
  }
  const cells = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i >= STATE.guesses.length) { cells.push('⬛'); continue; }
    const r = STATE.guesses[i].result;
    cells.push(r === 'correct' ? '🟣' : r === 'close' ? '🟡' : '⚪');
  }
  return `${header}\n${scoreLine}\n${cells.join('')}\n${SITE_URL}`;
}

function renderStatsModal() {
  $('stat-played').textContent = STATS.played;
  $('stat-winpct').textContent = STATS.played
    ? `${Math.round(100 * STATS.wins / STATS.played)}%` : '0%';
  $('stat-streak').textContent = STATS.currentStreak;
  $('stat-max').textContent = STATS.maxStreak;
  renderDistribution();
}

function renderDistribution() {
  const ul = $('stat-dist');
  ul.innerHTML = '';
  const max = Math.max(1, ...Object.values(STATS.distribution));
  const todayKey = STATE.status === 'won' ? STATE.guesses.length : (STATE.status === 'lost' ? 'X' : null);
  for (const key of [1, 2, 3, 4, 5, 6, 'X']) {
    const count = STATS.distribution[key] || 0;
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = key;
    const bar = document.createElement('div');
    bar.className = 'bar' + (key === todayKey ? ' today' : '');
    bar.style.width = `${Math.max(8, (count / max) * 100)}%`;
    bar.textContent = count > 0 ? count : '';
    const num = document.createElement('span');
    num.textContent = '';
    li.append(label, bar, num);
    ul.appendChild(li);
  }
}

async function onShare() {
  const text = $('share-text').textContent;
  try {
    await navigator.clipboard.writeText(text);
    const t = $('share-toast');
    t.hidden = false;
    setTimeout(() => { t.hidden = true; }, 2000);
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('share-text'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function tickCountdown() {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0
  ));
  let ms = next - now;
  const h = Math.floor(ms / 3_600_000); ms -= h * 3_600_000;
  const m = Math.floor(ms / 60_000);    ms -= m * 60_000;
  const s = Math.floor(ms / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const el = $('countdown');
  if (el) el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function showFatal(msg) {
  document.body.innerHTML = `<main style="padding:40px 20px;max-width:480px;margin:0 auto;text-align:center;color:#f6ecf3;font-family:system-ui">
    <h1 style="font-size:22px;font-family:'Cormorant Garamond',serif">Booky</h1>
    <p style="color:#b09ab8;margin-top:14px">${msg}</p>
    <p style="margin-top:20px"><a href="/" style="color:#f8b6da">← Back to 90books</a></p>
  </main>`;
}

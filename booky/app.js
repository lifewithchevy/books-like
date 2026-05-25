// Booky — daily romantasy word game. Wordle clone with a curated word list.
// Single static page. No backend. LocalStorage only.

const WORD_LEN = 5;
const MAX_GUESSES = 6;
const STATE_KEY = '90books_booky_word_v1';
const STATS_KEY = '90books_booky_word_stats_v1';
const SITE_URL = '90books.com/booky';

let DATA = null;       // { epoch, queue }
let ANSWER = null;     // today's word, uppercase
let DAY = null;        // 1-indexed day number
let STATE = null;
let STATS = null;
let CURRENT = '';      // letters being typed for current guess
let LOCKED = false;    // true once game ends (no more input)
let FLIPPING = false;  // true while a row's tiles are flipping

const $ = (id) => document.getElementById(id);

// ---- Boot ----
(async function init() {
  try {
    DATA = await fetch('/booky/words.json?v=4', { cache: 'no-store' }).then(r => r.json());
  } catch {
    return showFatal("Couldn't load today's word. Try refreshing.");
  }

  DAY = computeDayNumber(DATA.epoch);
  if (DAY < 1 || DAY > DATA.queue.length) {
    return showFatal(DAY < 1
      ? "Booky hasn't launched yet — come back soon!"
      : "Out of words — new ones loading soon!");
  }
  ANSWER = DATA.queue[DAY - 1].toUpperCase();

  STATS = loadStats();
  STATE = loadState();
  if (!STATE || STATE.dayNumber !== DAY) {
    STATE = freshState();
    saveState();
  }

  $('day-number').textContent = `No. ${DAY}`;
  buildBoard();
  paintBoardFromState();
  paintKeyboardFromState();
  bindUI();

  if (STATE.status !== 'playing') {
    LOCKED = true;
    showEndScreen();
  }

  // First-time visitor: show help
  if (!localStorage.getItem('90books_booky_seen_help_v1')) {
    localStorage.setItem('90books_booky_seen_help_v1', '1');
    setTimeout(() => $('help-modal').showModal(), 400);
  }
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
    guesses: [],   // ['FATED', ...]
    status: 'playing' // | 'won' | 'lost'
  };
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch { return null; }
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

// ---- Wordle evaluation ----
// Standard double-letter handling:
// 1. Mark exact matches (correct).
// 2. For remaining guess letters, look them up against unmatched answer letters
//    (present) — each answer letter can only be matched once.
function evaluate(guess, answer) {
  const result = new Array(WORD_LEN).fill('absent');
  const used = new Array(WORD_LEN).fill(false);

  // Pass 1: correct
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  // Pass 2: present
  for (let i = 0; i < WORD_LEN; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < WORD_LEN; j++) {
      if (used[j]) continue;
      if (guess[i] === answer[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

// ---- Board rendering ----
function buildBoard() {
  const el = $('board');
  el.innerHTML = '';
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.className = 'brow';
    row.dataset.row = r;
    for (let c = 0; c < WORD_LEN; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.row = r;
      tile.dataset.col = c;
      row.appendChild(tile);
    }
    el.appendChild(row);
  }
}

function paintBoardFromState() {
  // Repaint all submitted guesses (instant, no animation)
  for (let r = 0; r < STATE.guesses.length; r++) {
    const guess = STATE.guesses[r];
    const result = evaluate(guess, ANSWER);
    paintRow(r, guess, result, false);
  }
  // Repaint current in-progress buffer (if any)
  paintCurrent();
}

function paintRow(r, guess, result, animate) {
  const row = $('board').children[r];
  for (let c = 0; c < WORD_LEN; c++) {
    const tile = row.children[c];
    tile.textContent = guess[c];
    if (animate) {
      setTimeout(() => {
        tile.classList.add('revealed', result[c]);
      }, c * 280);
    } else {
      tile.classList.add('revealed', result[c]);
    }
  }
}

function paintCurrent() {
  if (LOCKED) return;
  const r = STATE.guesses.length;
  if (r >= MAX_GUESSES) return;
  const row = $('board').children[r];
  for (let c = 0; c < WORD_LEN; c++) {
    const tile = row.children[c];
    const ch = CURRENT[c] || '';
    tile.textContent = ch;
    tile.classList.toggle('filled', !!ch);
  }
}

function paintKeyboardFromState() {
  // For each letter, apply the strongest known state across all guesses.
  // Strength: correct > present > absent.
  const best = {};
  const strength = { correct: 3, present: 2, absent: 1 };
  for (const guess of STATE.guesses) {
    const result = evaluate(guess, ANSWER);
    for (let i = 0; i < WORD_LEN; i++) {
      const ch = guess[i];
      const s = result[i];
      if (!best[ch] || strength[s] > strength[best[ch]]) best[ch] = s;
    }
  }
  document.querySelectorAll('.kb-key').forEach(btn => {
    const k = btn.dataset.key;
    if (k === 'ENTER' || k === 'BACK') return;
    btn.classList.remove('correct', 'present', 'absent');
    if (best[k]) btn.classList.add(best[k]);
  });
}

// ---- Input ----
function bindUI() {
  // On-screen keyboard
  document.querySelectorAll('.kb-key').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleKey(btn.dataset.key);
    });
  });

  // Hardware keyboard
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'Enter')           { handleKey('ENTER'); e.preventDefault(); }
    else if (k === 'Backspace')  { handleKey('BACK');  e.preventDefault(); }
    else if (/^[a-zA-Z]$/.test(k)) { handleKey(k.toUpperCase()); }
  });

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
}

function handleKey(k) {
  if (LOCKED || FLIPPING) return;
  if (k === 'ENTER')      return submitGuess();
  if (k === 'BACK')       return backspace();
  if (/^[A-Z]$/.test(k))  return addLetter(k);
}

function addLetter(letter) {
  if (CURRENT.length >= WORD_LEN) return;
  CURRENT += letter;
  paintCurrent();
}

function backspace() {
  if (CURRENT.length === 0) return;
  CURRENT = CURRENT.slice(0, -1);
  paintCurrent();
}

function submitGuess() {
  if (CURRENT.length < WORD_LEN) {
    return shake('Not enough letters');
  }
  // No dictionary check for v1 — accept any 5-letter string.

  const r = STATE.guesses.length;
  const guess = CURRENT;
  CURRENT = '';
  STATE.guesses.push(guess);
  const result = evaluate(guess, ANSWER);

  // Animate reveal, then update state + keyboard
  FLIPPING = true;
  paintRow(r, guess, result, true);

  const revealTotal = (WORD_LEN - 1) * 280 + 550; // last tile finishes flipping
  setTimeout(() => {
    paintKeyboardFromState();
    FLIPPING = false;

    if (guess === ANSWER) {
      STATE.status = 'won';
    } else if (STATE.guesses.length >= MAX_GUESSES) {
      STATE.status = 'lost';
    }
    saveState();

    if (STATE.status !== 'playing') {
      LOCKED = true;
      setTimeout(showEndScreen, 400);
    }
  }, revealTotal);
}

function shake(message) {
  const r = STATE.guesses.length;
  const row = $('board').children[r];
  if (row) {
    row.classList.add('shake');
    setTimeout(() => row.classList.remove('shake'), 450);
  }
  showToast(message);
}

let toastTimer = null;
function showToast(msg) {
  const t = $('floating-toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 1600);
}

// ---- End screen ----
function showEndScreen() {
  recordFinish();
  $('end-headline').textContent = STATE.status === 'won'
    ? `Solved in ${STATE.guesses.length}/${MAX_GUESSES} 🔥`
    : `So close.`;
  $('end-word').textContent = ANSWER;
  $('share-text').textContent = buildShareString();
  renderStatsModal();
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
  const rows = STATE.guesses.map(g => {
    const r = evaluate(g, ANSWER);
    return r.map(s => s === 'correct' ? '🟪' : s === 'present' ? '🟨' : '⬛').join('');
  });
  return `${header}\n${scoreLine}\n${rows.join('\n')}\n${SITE_URL}`;
}

function renderStatsModal() {
  $('stat-played').textContent = STATS.played;
  $('stat-winpct').textContent = STATS.played
    ? Math.round(100 * STATS.wins / STATS.played) : 0;
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
    li.append(label, bar);
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
    <h1 style="font-size:26px;font-family:'Cormorant Garamond',serif">Booky</h1>
    <p style="color:#b09ab8;margin-top:14px">${msg}</p>
    <p style="margin-top:20px"><a href="/" style="color:#f8b6da">← Back to 90books</a></p>
  </main>`;
}

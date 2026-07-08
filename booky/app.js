// Booky — daily romantasy word game. Wordle clone with a curated word list.
// Single static page. No backend. LocalStorage only.

const WORD_LEN = 5;
const MAX_GUESSES = 6;
const STATE_KEY = '90books_booky_word_v1';
const STATS_KEY = '90books_booky_word_stats_v1';
const SITE_URL = '90books.com/booky';
const REDDIT_DAILY_THREAD = 'https://www.reddit.com/r/B00KY/comments/1upibhw/daily_results_thread_booky/';
const SHARE_PLAY_LINK = 'https://90books.com/booky?utm_source=reddit&utm_medium=social&utm_campaign=b00ky_daily';

// Slugs that have fully curated recommendation pages on 90books.com.
// Only show a clickable link on the end screen for these — the rest show
// the book title as plain text (still sparks curiosity, no broken landing).
// Must exactly match the books that have a hand-curated /books-like/ page in
// index.html searchData. If a daily word points to a book NOT in this set, the
// end-screen shows the title/author as plain text (no link), never a thin page.
// Keep this in sync whenever a new page is curated just-in-time for a daily word.
const CURATED_SLUGS = new Set([
  'a-court-of-mist-and-fury',
  'a-court-of-thorns-and-roses',
  'fourth-wing',
  'from-blood-and-ash',
  'gild',
  'house-of-earth-and-blood',
  'one-dark-window',
  'quicksilver',
  'the-bridge-kingdom',
  'the-cruel-prince',
  'the-serpent-and-the-wings-of-night',
  'throne-of-glass',
  'weavingshaw',
]);

let DATA = null; // { epoch, queue }
let ANSWER = null; // today's word, uppercase
let DAY = null; // 1-indexed day number
let STATE = null;
let STATS = null;
let CURRENT = ''; // letters being typed for current guess
let LOCKED = false; // true once game ends (no more input)
let FLIPPING = false; // true while a row's tiles are flipping
let DICT = null; // Set<string> of accepted 5-letter words (uppercase)

const $ = (id) => document.getElementById(id);

// ---- Boot ----
(async function init() {
try {
// Pull queue + dictionary in parallel. Dictionary is large (~80KB) but
// only loaded once — browser caches it. The Set lookup is O(1).
const [data, dictList] = await Promise.all([
fetch('/booky/words.json?v=7', { cache: 'no-store' }).then(r => r.json()),
fetch('/booky/dictionary.json?v=12', { cache: 'force-cache' }).then(r => r.json()),
]);
DATA = data;
DICT = new Set(dictList);
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

buildBoard();
paintBoardFromState();
paintKeyboardFromState();
bindUI();

// Show today's puzzle number in the header (e.g. "#23")
$('puzzle-no').textContent = '#' + DAY;

// PostHog: fire game_start only on a fresh game (no guesses yet today)
if (STATE.guesses.length === 0 && STATE.status === 'playing') {
posthog.capture('booky_game_start', {
word_number: DAY,
date: new Date().toISOString().split('T')[0],
});
}

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

// Day number is based on the user's LOCAL calendar date — same as Wordle.
// Each user gets the same word as everyone else on the same date, but the
// rollover happens at their local midnight, not at a fixed UTC moment.
// Travel across timezones can shift day numbers by ±1 for some users on
// the boundary — acceptable edge case; Wordle behaves the same way.
function computeDayNumber(epochStr) {
const [y, m, d] = epochStr.split('-').map(Number);
// Local midnight on the epoch date
const epochLocal = new Date(y, m - 1, d, 0, 0, 0).getTime();
// Local midnight today
const now = new Date();
const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
return Math.floor((todayLocal - epochLocal) / 86_400_000) + 1;
}

// ---- State ----
function freshState() {
return {
dayNumber: DAY,
guesses: [], // ['FATED', ...]
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
if (s && typeof s === 'object') {
// Stats saved before the Ward existed — grant the starting one.
if (typeof s.wards !== 'number') s.wards = 1;
return s;
}
} catch {}
return {
currentStreak: 0, maxStreak: 0, played: 0, wins: 0,
distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 },
lastPlayedDay: 0,
wards: 1
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
// Streak Ward (Duolingo streak-freeze, romantasy-skinned): a single missed
// day is auto-covered if a Ward is banked. Two+ missed days always break.
const gap = STATS.lastPlayedDay ? DAY - STATS.lastPlayedDay : 1;
if (gap === 2 && STATS.wards > 0) {
STATS.wards -= 1;
STATE.wardUsed = true; // persisted so the end screen shows the save on re-open
saveState();
}
const broken = gap > 1 && !STATE.wardUsed;
STATS.currentStreak = broken ? 1 : STATS.currentStreak + 1;
if (STATS.currentStreak > STATS.maxStreak) STATS.maxStreak = STATS.currentStreak;
// The Ward recharges at every 7-day streak mark (one banked at a time)
if (STATS.currentStreak % 7 === 0) STATS.wards = 1;
} else {
STATS.distribution.X += 1;
STATS.currentStreak = 0;
}
STATS.lastPlayedDay = DAY;
saveStats();

// Keep subscriber's streak fresh in Resend so daily email is personalized.
// Fire-and-forget — never block or show errors to the player.
const subEmail = localStorage.getItem('90books_booky_reminder_sub');
if (subEmail) {
fetch('/api/booky-update-streak', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email: subEmail, streak: STATS.currentStreak }),
}).catch(() => {});
}

// PostHog: game complete (fires once per game via statsRecorded guard above)
posthog.capture('booky_game_complete', {
word_number: DAY,
won: STATE.status === 'won',
guesses_used: STATE.guesses.length,
current_streak: STATS.currentStreak,
answer: ANSWER,
});
}

// ---- Wordle evaluation ----
// Standard double-letter handling:
// 1. Mark exact matches (correct).
// 2. For remaining guess letters, look them up against unmatched answer letters
// (present) — each answer letter can only be matched once.
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
if (k === 'Enter') { handleKey('ENTER'); e.preventDefault(); }
else if (k === 'Backspace') { handleKey('BACK'); e.preventDefault(); }
else if (/^[a-zA-Z]$/.test(k)) { handleKey(k.toUpperCase()); }
});

$('help-btn').addEventListener('click', () => $('help-modal').showModal());
$('stats-btn').addEventListener('click', () => {
renderStatsModal();
$('stats-modal').showModal();
});
$('share-btn').addEventListener('click', openShareSheet);
const shareSheet = $('share-sheet');
if (shareSheet) {
  $('share-sheet-close')?.addEventListener('click', () => shareSheet.close());
  $('share-reddit-btn')?.addEventListener('click', onShareReddit);
  $('share-copy-result-btn')?.addEventListener('click', onShareCopyResult);
  $('share-copy-link-btn')?.addEventListener('click', onShareCopyLink);
}
$('end-modal').querySelector('[data-close-end]').addEventListener('click', (e) => {
e.preventDefault();
$('end-modal').close();
});
$('reminder-form').addEventListener('submit', onReminderSubmit);
}

async function onReminderSubmit(e) {
e.preventDefault();
const input = $('reminder-email');
const btn = $('reminder-submit');
const toast = $('reminder-toast');
const email = (input.value || '').trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
toast.textContent = 'hmm, that email looks off. mind checking it?';
toast.className = 'reminder-toast reminder-error';
toast.hidden = false;
return;
}

btn.disabled = true;
btn.textContent = 'saving…';

try {
const res = await fetch('/api/booky-subscribe', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
email,
source: 'win-screen',
streak: STATS.currentStreak,
}),
});
if (!res.ok) throw new Error('subscribe-failed');
localStorage.setItem('90books_booky_reminder_sub', email);
// PostHog: email signup completed
posthog.capture('email_signup_completed', {
source: 'booky_endscreen',
word_number_at_signup: DAY,
});
toast.textContent = "you're in. i'll email you a reminder for tomorrow's word.";
toast.className = 'reminder-toast reminder-success';
toast.hidden = false;
// Collapse the form, leaving only the toast
setTimeout(() => {
$('reminder-form').querySelector('.reminder-row').style.display = 'none';
$('reminder-form').querySelector('.reminder-pitch').style.display = 'none';
$('reminder-form').querySelector('.reminder-headline').style.display = 'none';
}, 600);
} catch {
toast.textContent = "couldn't save right now. try again in a sec?";
toast.className = 'reminder-toast reminder-error';
toast.hidden = false;
btn.disabled = false;
btn.textContent = 'remind me';
}
}

function handleKey(k) {
if (LOCKED || FLIPPING) return;
if (k === 'ENTER') return submitGuess();
if (k === 'BACK') return backspace();
if (/^[A-Z]$/.test(k)) return addLetter(k);
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
// Wordle-style dictionary check: only accept real 5-letter words.
// The today's-word answer is always in DICT, so checking the guess against
// DICT covers both correct guesses and any other valid word the player tries.
if (DICT && !DICT.has(CURRENT)) {
return shake('Not in word list');
}

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

// ---- Badge milestones ----
// Tiered streak rewards traced as a romantasy heroine's journey:
// outsider → bonded → cadet → rider → knight → mage → champion → ruler → divine.
// Each tier is hit at `at` days of current streak. Ascending.
const BADGES = [
{ at: 1, icon: '✨', name: 'Initiate', blurb: 'You crossed the veil.' },
{ at: 3, icon: '💫', name: 'Bonded', blurb: 'Three days. Something just clicked.' },
{ at: 7, icon: '🗡️', name: 'Cadet', blurb: 'First week survived. The academy claims you.' },
{ at: 14, icon: '🐉', name: 'Rider', blurb: 'Two weeks. The dragon chose you.' },
{ at: 30, icon: '⚔️', name: 'Knight', blurb: 'A month, sworn. Sharpened by ritual.' },
{ at: 60, icon: '🔮', name: 'Sorceress', blurb: 'Magic mastered. Two months unbroken.' },
{ at: 100, icon: '🏆', name: 'Champion', blurb: '100 days. You won the trial.' },
{ at: 200, icon: '👑', name: 'High Lady', blurb: '200 days. The court bows.' },
{ at: 365, icon: '💎', name: 'Empress', blurb: 'One year. The realm is yours.' },
{ at: 1000, icon: '🌌', name: 'Goddess', blurb: '1000 days. You are myth.' },
];

function badgeForStreak(streak) {
let earned = null;
let next = null;
for (const b of BADGES) {
if (streak >= b.at) earned = b;
else { next = b; break; }
}
return { earned, next };
}

// ---- End screen ----
function showEndScreen() {
recordFinish();

const won = STATE.status === 'won';
const tries = STATE.guesses.length;

// Hero 1: win/lose headline + the word. Guess count moved to the stats page.
const title = $('end-headline');
if (won) {
title.textContent = 'Congrats!';
$('celebration').classList.remove('lost');
$('celebration').classList.add('won');
} else {
title.textContent = "Tomorrow's another word.";
$('celebration').classList.remove('won');
$('celebration').classList.add('lost');
}
$('end-word').textContent = ANSWER;
$('end-puzzle-no').textContent = 'Booky #' + DAY;

// Streak — kept but low priority: one compact line on win
const streakEl = $('end-streak');
if (won && STATS.currentStreak >= 1) {
// Show the earned romantasy rank — the shareable bit. Milestone progress lives in the stats page.
const { earned } = badgeForStreak(STATS.currentStreak);
streakEl.textContent = `🔥 ${STATS.currentStreak}-day streak · ${earned.icon} ${earned.name}`;
streakEl.hidden = false;
} else {
streakEl.hidden = true;
}

// Ward receipt — only shows on the day a Ward actually saved the streak
const wardEl = $('end-ward');
if (won && STATE.wardUsed) {
wardEl.textContent = '🛡️ your Ward covered the day you missed. streak intact.';
wardEl.hidden = false;
} else {
wardEl.hidden = true;
}

// Mirror to legacy stats modal (still accessible via the ▤ icon)
renderStatsModal();

// Hero 2: the word's book. CTA adapts — sponsored buy link, curated page, or none.
const bookRec = DATA.wordBooks?.[ANSWER];
const recEl = $('book-rec');
if (bookRec) {
$('book-rec-title').textContent = bookRec.title;
$('book-rec-author').textContent = bookRec.author;

const cover = $('book-rec-cover');
const coverLink = $('book-rec-cover-link');
if (bookRec.cover) {
cover.src = bookRec.cover;
cover.alt = `${bookRec.title} cover`;
cover.hidden = false;
cover.onerror = () => {
cover.hidden = true;
coverLink.hidden = true;
};
} else {
cover.hidden = true;
}

// Hook line hidden for now (per Olga) — keep the element + data so it can
// be re-enabled later by restoring the `bookRec.hook` conditional.
$('book-rec-hook').hidden = true;

// One secondary text link under the book (Share is the only primary CTA).
// Prefer Amazon buy; fall back to curated books-like page. Cover uses the same URL.
const linkEl = $('book-rec-link');
const trackAffiliateBuy = () => posthog.capture('affiliate_buy_clicked', {
word_number: DAY,
book: bookRec.slug,
title: bookRec.title,
});
const trackBooksLike = () => posthog.capture('booky_books_like_clicked', {
word_number: DAY,
book: bookRec.slug,
title: bookRec.title,
});
if (bookRec.buyUrl) {
linkEl.href = bookRec.buyUrl;
linkEl.textContent = 'Get it on Amazon →';
linkEl.rel = 'noopener sponsored';
linkEl.hidden = false;
linkEl.onclick = trackAffiliateBuy;
coverLink.href = bookRec.buyUrl;
coverLink.rel = 'noopener sponsored';
coverLink.hidden = cover.hidden;
coverLink.onclick = trackAffiliateBuy;
} else if (CURATED_SLUGS.has(bookRec.slug)) {
linkEl.href = `https://90books.com/books-like/${bookRec.slug}`;
linkEl.textContent = 'More books like this →';
linkEl.rel = 'noopener';
linkEl.hidden = false;
linkEl.onclick = trackBooksLike;
coverLink.href = linkEl.href;
coverLink.rel = 'noopener';
coverLink.hidden = cover.hidden;
coverLink.onclick = trackBooksLike;
} else {
linkEl.hidden = true;
linkEl.onclick = null;
coverLink.hidden = true;
coverLink.onclick = null;
}
recEl.hidden = false;
} else {
recEl.hidden = true;
}

// Reminder form — only show if user hasn't already subscribed
const subscribed = localStorage.getItem('90books_booky_reminder_sub');
const reminderForm = $('reminder-form');
reminderForm.style.display = subscribed ? 'none' : 'block';
$('reminder-active').hidden = !subscribed;

// Tomorrow tease — optional per-word copy in words.json `teases`, keyed by
// TOMORROW's word (queue is 0-indexed, so index DAY = day DAY+1). Open loop
// for the return visit; stays hidden on days without written copy.
const teaseEl = $('tomorrow-tease');
const tomorrowWord = DATA.queue[DAY];
const tease = tomorrowWord ? DATA.teases?.[tomorrowWord.toUpperCase()] : null;
if (tease) {
teaseEl.textContent = tease;
teaseEl.hidden = false;
} else {
teaseEl.hidden = true;
}

$('end-modal').showModal();
tickCountdown();

if (!window.__countdownTicker) {
window.__countdownTicker = setInterval(tickCountdown, 1000);
}
}

function buildShareString() {
// INTENTIONALLY a bare, schemeless, NON-clickable "90books.com/booky" — do
// not add https:// or a tracking query to "fix" the dead link. Reddit (and
// similar) downrank posts perceived as link self-promotion, so we keep the
// URL as plain text: it plants the name for people to search (the Wordle
// move) without tripping anti-link penalties.
//
// The Reddit MOBILE app already leaves a bare domain as plain text, but the
// Reddit DESKTOP web composer auto-links "90books.com/booky" on paste. We
// can't change their editor, so we insert a zero-width space (U+200B) inside
// the ".com" — the string still READS as "90books.com/booky" but no longer
// matches a domain.tld pattern, so nothing auto-links it on any surface.
//
// Web-browser visits still attribute via PostHog's automatic $referrer /
// $referring_domain; the native/clipboard split lives on the
// booky_share_clicked event's `method`.
const shareUrl = SITE_URL.replace('.com', '.\u200Bcom');
// The rank rides in the header — identity is the shareable bit (Spelling
// Bee's "Genius" effect): "🐉 Rider" makes a stranger ask what Booky is.
let header = `📚 Booky #${DAY}`;
let scoreLine;
if (STATE.status === 'won') {
const { earned } = badgeForStreak(STATS.currentStreak);
if (earned) header += ` · ${earned.icon} ${earned.name}`;
const streak = STATS.currentStreak > 1 ? ` 🔥${STATS.currentStreak}` : '';
scoreLine = `${STATE.guesses.length}/${MAX_GUESSES}${streak}`;
} else {
scoreLine = `🥀 X/${MAX_GUESSES}`;
}
const rows = STATE.guesses.map(g => {
const r = evaluate(g, ANSWER);
return r.map(s => s === 'correct' ? '🟪' : s === 'present' ? '🟨' : '⬛').join('');
});
const bookRec = DATA.wordBooks?.[ANSWER];
const bookLine = bookRec ? `📖 From: ${bookRec.title}` : null;
// Two trailing spaces before every \n = Reddit hard break; invisible on all other platforms
const HB = '  \n';
const lines = [header, scoreLine, ...rows, ...(bookLine ? [bookLine] : []), shareUrl];
return lines.join(HB);
}

function renderStatsModal() {
$('stat-played').textContent = STATS.played;
$('stat-winpct').textContent = STATS.played
? Math.round(100 * STATS.wins / STATS.played) : 0;
$('stat-streak').textContent = STATS.currentStreak;
$('stat-max').textContent = STATS.maxStreak;

// Earned rank + progress to next milestone (moved here from the win screen)
const mEl = $('stat-milestone');
if (STATS.currentStreak >= 1) {
const { earned, next } = badgeForStreak(STATS.currentStreak);
let txt = `${earned.icon} ${earned.name} · ${earned.blurb}`;
if (next) {
const rem = next.at - STATS.currentStreak;
txt += ` ${rem} day${rem === 1 ? '' : 's'} to ${next.icon} ${next.name}.`;
}
// Ward status line hidden for now (mechanic still runs silently; the gold
// receipt still shows on a day a Ward actually saves the streak).
mEl.textContent = txt;
mEl.hidden = false;
} else {
mEl.hidden = true;
}

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

function shareProps() {
  return {
    word_number: DAY,
    won: STATE.status === 'won',
    guesses_used: STATE.guesses.length,
    streak: STATS.currentStreak,
  };
}

function captureShare(method) {
  posthog.capture('booky_share_clicked', { ...shareProps(), method });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      window.prompt('Copy:', text);
      return true;
    } catch {
      return false;
    }
  }
}

function openShareSheet() {
  const sheet = $('share-sheet');
  const preview = $('share-preview');
  if (!sheet || !preview) return;
  preview.textContent = buildShareString();
  if (typeof sheet.showModal === 'function') sheet.showModal();
}

async function onShareReddit() {
  const text = buildShareString();
  await copyText(text);
  window.open(REDDIT_DAILY_THREAD, '_blank', 'noopener,noreferrer');
  captureShare('reddit');
  $('share-sheet')?.close();
  showShareToast('Copied! Paste as a comment in r/B00KY 💜');
}

async function onShareCopyResult() {
  const ok = await copyText(buildShareString());
  if (!ok) return;
  captureShare('clipboard');
  $('share-sheet')?.close();
  showShareToast('Copied! Paste it anywhere 📋');
}

async function onShareCopyLink() {
  const ok = await copyText(SHARE_PLAY_LINK);
  if (!ok) return;
  captureShare('copy_link');
  $('share-sheet')?.close();
  showShareToast('Link copied! Send friends to Booky 🔗');
}

function showShareToast(msg) {
const t = $('share-toast');
if (!t) return;
t.textContent = msg;
t.hidden = false;
void t.offsetWidth; // force reflow so the transition plays on re-trigger
t.classList.add('show');
clearTimeout(t._timer);
t._timer = setTimeout(() => {
t.classList.remove('show');
// let the fade-out finish before removing from layout
setTimeout(() => { t.hidden = true; }, 260);
}, 2500);
}

function tickCountdown() {
// Count down to the user's next LOCAL midnight — when the next word drops
// for them. Matches the local-date day-number computation above so the
// countdown hitting 00:00:00 is exactly when DAY increments.
const now = new Date();
const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
let ms = next - now;
const h = Math.floor(ms / 3_600_000); ms -= h * 3_600_000;
const m = Math.floor(ms / 60_000); ms -= m * 60_000;
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

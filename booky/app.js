// Booky — daily romantasy word game. Wordle clone with a curated word list.
// Single static page. No backend. LocalStorage only.

const WORD_LEN = 5;
const MAX_GUESSES = 6;
const STATE_KEY = '90books_booky_word_v1';
const STATS_KEY = '90books_booky_word_stats_v1';
const SITE_URL = '90books.com/booky';
// Short, clean link used in shares. Redirects to /booky?utm_source=share.
// Emitted BARE (no https://), the way squaredle.app does it — apps linkify a
// plain domain, and a scheme makes the line look like a tracking URL.
// /s is kept alive in vercel.json for shares already out in the wild.
const SHARE_URL = '90books.com/play';
const REDDIT_DAILY_THREAD = 'https://www.reddit.com/r/B00KY/comments/1upibhw/daily_results_thread_booky/';

// Slugs that have fully curated recommendation pages on 90books.com.
// Only show a clickable link on the end screen for these — the rest show
// the book title as plain text (still sparks curiosity, no broken landing).
// Must exactly match the books that have a hand-curated /books-like/ page in
// index.html searchData. If a daily word points to a book NOT in this set, the
// end-screen shows the title/author as plain text (no link), never a thin page.
// Keep this in sync whenever a new page is curated just-in-time for a daily word.
const CURATED_SLUGS = new Set([
  'a-court-of-mist-and-fury',
  'a-court-of-silver-flames',
  'a-court-of-thorns-and-roses',
  'a-touch-of-darkness',
  'city-of-gods-and-monsters',
  'dire-bound',
  'fourth-wing',
  'from-blood-and-ash',
  'gild',
  'heartless-hunter',
  'hemlock-and-silver',
  'house-of-earth-and-blood',
  'in-the-veins-of-the-drowning',
  'iron-flame',
  'one-dark-window',
  'phantasma',
  'quicksilver',
  'six-of-crows',
  'starside',
  'the-bridge-kingdom',
  'the-cruel-prince',
  'the-knight-and-the-moth',
  'the-serpent-and-the-wings-of-night',
  'throne-in-the-dark',
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
// Last known-good queue. `queue` + `epoch` are enough to compute the word for
// every remaining day, so a cached copy keeps returning players playing through
// a total backend outage. On 2026-08-04 the upstream project 404'd and every
// player got a dead screen; with this they would not have noticed.
const WORDS_CACHE_KEY = '90books_booky_words_cache';

// One transient blip used to kill the whole boot with no retry, and a 500 that
// returned an HTML error page threw on .json() the same way a network failure
// did. Retry with backoff and treat a non-2xx as a failure worth retrying.
async function fetchJSON(url, opts, tries = 3) {
let lastErr;
for (let i = 0; i < tries; i++) {
try {
const r = await fetch(url, opts);
if (!r.ok) throw new Error('HTTP ' + r.status);
return await r.json();
} catch (e) {
lastErr = e;
if (i < tries - 1) await new Promise((res) => setTimeout(res, 400 * (i + 1)));
}
}
throw lastErr;
}

function looksLikeQueue(d) {
return !!(d && d.epoch && Array.isArray(d.queue) && d.queue.length);
}

(async function init() {
// The queue is the only hard requirement. Network first, then the cached copy.
let data = null;
try {
data = await fetchJSON('/api/booky-words', { cache: 'no-store' });
if (looksLikeQueue(data)) {
try { localStorage.setItem(WORDS_CACHE_KEY, JSON.stringify(data)); } catch {}
}
} catch {
data = null;
}
if (!looksLikeQueue(data)) {
try { data = JSON.parse(localStorage.getItem(WORDS_CACHE_KEY)); } catch { data = null; }
}
if (!looksLikeQueue(data)) {
return showFatal("Couldn't load today's word. Try refreshing.");
}
DATA = data;

// The dictionary only validates that a guess is a real word. Losing it must
// not cost anyone their streak, so on failure we play on and skip that check
// (the guard at the guess site is already `DICT && !DICT.has(...)`).
//
// 2026-08-25: NOT awaited any more. This used to block buildBoard() on a
// 166KB download, so the grid did not paint until a fourth serial round-trip
// finished — HTML, app.js, words, dictionary, and only then a single tile.
// Nothing before the first guess reads DICT, so it loads in the background and
// assigns itself when it lands. Worst case a guess submitted inside that
// ~200ms window skips the word-list check, which is exactly the already
// accepted behaviour when the fetch fails outright.
//
// Keep the call written as `fetchJSON('/booky/dictionary.json?v=17'` on one
// line: api/booky-app.js rewrites that literal to inject DICT_CACHE_V, and a
// reshaped call silently turns the cache-busting into a no-op.
fetchJSON('/booky/dictionary.json?v=17', { cache: 'force-cache' })
.then((words) => { DICT = new Set(words); })
.catch(() => { DICT = null; });

DAY = computeDayNumber(DATA.epoch);
if (DAY < 1 || DAY > DATA.queue.length) {
return showFatal(DAY < 1
? "Booky hasn't launched yet — come back soon!"
: "Out of words — new ones loading soon!");
}
ANSWER = DATA.queue[DAY - 1].toUpperCase();

STATS = loadStats();
// Restore from the anonymous player record before the board is built, so a
// player whose storage was evicted sees their real streak rather than a zero
// that flips a moment later.
syncPlayer();
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

// Warm the win screen's book cover while the player is still guessing, so it
// is already in cache the moment the end screen renders instead of popping in
// a beat later. Fire-and-forget: nothing reads this Image, the browser cache
// is the whole point, and a failure here is invisible (showEndScreen still
// runs its own load + fallback path).
preloadBookCover();

HINTS = loadHints();
initHint();

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

// Which hints today's player has taken. Deliberately NOT part of STATE: taking
// a hint changes nothing about the game, the streak or the share grid. This
// exists so a reload does not double-count, and so booky_game_complete can
// carry the flag and tell us whether hints rescue the players who used to quit.
const HINT_KEY = '90books_booky_hints_v1';
let HINTS = { day: 0, book: false };
function loadHints() {
try {
const h = JSON.parse(localStorage.getItem(HINT_KEY));
if (h && h.day === DAY) return { day: DAY, book: !!h.book };
} catch {}
return { day: DAY, book: false };
}
function saveHints() { try { localStorage.setItem(HINT_KEY, JSON.stringify(HINTS)); } catch {} }
function usedHint() { return !!HINTS.book; }

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

// Sync stats with the anonymous player record, for EVERY player — no email, no
// account, no install. The id lives in a server-set cookie, which is not
// script-writable storage and so is not deleted by the 7-day eviction that
// wipes localStorage. See api/booky-player.js.
//
// Fire-and-forget and never awaited by anything that matters: this runs on page
// load, and the game must not wait on the network to become playable.
function syncPlayer() {
return fetch('/api/booky-player', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ stats: { ...statsForServer(), currentStreak: STATS.currentStreak } }),
})
.then((r) => r.json())
.then((d) => { restoreStats(d && d.stats); })
.catch(() => {});
}

// The subset of stats we mirror server-side for subscribers. Deliberately not
// the whole object: the guess distribution is a nice-to-have, and `wards` is a
// spendable resource that must never be restorable by clearing storage.
function statsForServer() {
return {
maxStreak: STATS.maxStreak,
played: STATS.played,
wins: STATS.wins,
lastPlayedDay: STATS.lastPlayedDay,
};
}

// Merge a server-held record back into local stats after the player identifies
// themselves by email. Runs when someone signs up on a device that has no
// history — a new phone, a cleared cache, or Safari's 7-day eviction of a
// lapsed player.
//
// Rules, in order of how much damage getting them wrong would do:
//  - Totals only ever go UP (max of local and remote). A player who has been
//    playing on two devices must never see their record cut down by signing up.
//  - The current streak is restored ONLY if the record proves it is still
//    alive — last played today or yesterday. A 30-day streak last touched
//    three weeks ago is dead, and handing it back would make the streak, and
//    the badges built on it, mean nothing.
//  - Legacy contacts stored a bare streak with no lastPlayedDay. Those cannot
//    be validated, so the streak is not restored; the totals still are.
//  - `wards` is never restored (see statsForServer).
function restoreStats(remote) {
if (!remote) return false;
let changed = false;
const lift = (key) => {
const v = remote[key];
if (typeof v === 'number' && v > (STATS[key] || 0)) { STATS[key] = v; changed = true; }
};
lift('maxStreak');
lift('played');
lift('wins');

const alive = typeof remote.lastPlayedDay === 'number' &&
(remote.lastPlayedDay === DAY || remote.lastPlayedDay === DAY - 1);
if (alive && typeof remote.currentStreak === 'number' &&
remote.currentStreak > (STATS.currentStreak || 0)) {
STATS.currentStreak = remote.currentStreak;
if (STATS.currentStreak > STATS.maxStreak) STATS.maxStreak = STATS.currentStreak;
STATS.lastPlayedDay = Math.max(STATS.lastPlayedDay || 0, remote.lastPlayedDay);
changed = true;
}

if (changed) {
saveStats();
renderStatsModal();
posthog.capture('booky_stats_restored', {
restored_streak: STATS.currentStreak,
restored_max_streak: STATS.maxStreak,
restored_played: STATS.played,
streak_was_alive: alive,
});
}
return changed;
}

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

// Persist the finished game to the anonymous player record. This is the write
// that makes the streak survivable for players who never give an email.
syncPlayer();

// Keep subscriber's streak fresh in Resend so daily email is personalized.
// Fire-and-forget — never block or show errors to the player.
const subEmail = localStorage.getItem('90books_booky_reminder_sub');
if (subEmail) {
fetch('/api/booky-update-streak', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email: subEmail, streak: STATS.currentStreak, stats: statsForServer() }),
}).catch(() => {});
}

// PostHog: game complete (fires once per game via statsRecorded guard above)
// book/book_title identify the featured book on the event itself. Without
// them, "how many people saw this author's book" needs a word_number -> book
// join against words.json, whose LIVE source is a different Vercel project —
// so the join was neither reproducible nor safe to quote to an author. With
// them, reach and buy-click CTR come from one group-by on book_title.
const completedBook = DATA?.wordBooks?.[ANSWER] || null;
posthog.capture('booky_game_complete', {
word_number: DAY,
won: STATE.status === 'won',
guesses_used: STATE.guesses.length,
current_streak: STATS.currentStreak,
answer: ANSWER,
book: completedBook?.slug || null,
book_title: completedBook?.title || null,
book_author: completedBook?.author || null,
used_hint: usedHint(),
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
// A sheet is open (hint, help, stats, share): the keyboard belongs to it, not
// to the board. Without this, Enter on the hint's spoiler both lifted the veil
// AND submitted whatever was half-typed underneath, and letters kept landing
// on the grid behind the dialog.
if (document.querySelector('dialog[open]')) return;
const k = e.key;
if (k === 'Enter') { handleKey('ENTER'); e.preventDefault(); }
else if (k === 'Backspace') { handleKey('BACK'); e.preventDefault(); }
else if (/^[a-zA-Z]$/.test(k)) { handleKey(k.toUpperCase()); }
});

$('help-btn').addEventListener('click', () => $('help-modal').showModal());

$('hint-btn')?.addEventListener('click', () => {
renderHints();
posthog.capture('booky_hint_opened', {
word_number: DAY,
guesses_used: STATE.guesses.length,
status: STATE.status,
book_taken: HINTS.book,
});
$('hint-modal').showModal();
});
document.querySelectorAll('[data-close-hint]').forEach((el) => {
el.addEventListener('click', () => $('hint-modal')?.close());
});
$('hint-spoiler')?.addEventListener('click', takeBook);
$('hint-spoiler')?.addEventListener('keydown', (e) => {
if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); takeBook(); }
});
$('stats-btn').addEventListener('click', () => {
renderStatsModal();
syncStatsReminder();
$('stats-modal').showModal();
});
// Wordle-exact: the win-screen button IS the share. On mobile it opens the OS
// sheet on the first tap; on desktop it copies. The old two-option dialog is
// gone — it cost a tap and duplicated what the OS sheet already offers.
$('share-btn').addEventListener('click', onSharePrimary);
const shareSheet = $('share-sheet');
if (shareSheet) {
  $('share-sheet-close')?.addEventListener('click', () => shareSheet.close());
  $('share-reddit-btn')?.addEventListener('click', onShareReddit);

}
$('end-modal').querySelector('[data-close-end]').addEventListener('click', (e) => {
e.preventDefault();
$('end-modal').close();
});
wireReminder($('reminder-form'));
buildStatsReminder();
$('giveaway-form').addEventListener('submit', onGiveawaySubmit);
$('giveaway-tap').addEventListener('click', onGiveawayTap);
}

// ---- Giveaway ----
// Everything below is inert unless words.json has a `giveaway` whose
// start..end range covers today. Dates are compared at LOCAL midnight, the
// same rollover the word itself uses, so the card flips exactly when the
// word does. There is deliberately no on/off switch: when `end` passes, the
// card disappears and the reminder form comes back by itself.

const GIVEAWAY_ENTERED_KEY = '90books_booky_giveaway_entered';

function localMidnight(dateStr) {
const [y, m, d] = String(dateStr).split('-').map(Number);
if (!y || !m || !d) return null;
return new Date(y, m - 1, d, 0, 0, 0).getTime();
}

// Returns the giveaway object if today falls inside its window, else null.
// `giveaway` may be a single object OR an array of them. The array form is
// what you want: scheduling a FUTURE giveaway must never overwrite one that
// is currently running. (That happened on 2026-07-29 — giveaway #2 was
// dropped into the single slot mid-window and killed the live card.)
function activeGiveaway() {
const raw = DATA?.giveaway;
if (!raw) return null;
const list = Array.isArray(raw) ? raw : [raw];
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
for (const g of list) {
if (!g || !g.start || !g.end) continue;
const start = localMidnight(g.start);
const end = localMidnight(g.end);
if (start == null || end == null) continue;
if (today >= start && today <= end) return g;
}
return null;
}

// Renders the card (or the confirmed state) and returns whether it's live.
function renderGiveaway() {
const card = $('giveaway');
const done = $('giveaway-in');
const g = activeGiveaway();

if (!g) {
card.hidden = true;
done.hidden = true;
return false;
}

// Already entered → show only the confirmation strip.
if (localStorage.getItem(GIVEAWAY_ENTERED_KEY) === g.tag) {
card.hidden = true;
$('giveaway-in-sub').textContent =
`winner announced ${g.announce} · 📩 daily reminders on`;
done.hidden = false;
return true;
}
done.hidden = true;

// Days remaining, inclusive of the final day.
const end = localMidnight(g.end);
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
const daysLeft = Math.round((end - today) / 86_400_000);
const daysEl = $('giveaway-days');
daysEl.textContent = daysLeft <= 0 ? 'last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
daysEl.classList.toggle('last', daysLeft <= 0);

$('giveaway-title').textContent = g.title || '';

const coverEl = $('giveaway-cover');
if (g.cover) {
coverEl.src = g.cover;
coverEl.alt = g.title || '';
coverEl.hidden = false;
// A broken cover must never leave a gap or a broken-image icon.
coverEl.onerror = () => { coverEl.hidden = true; };
} else {
coverEl.hidden = true;
}

// Two states only: subscribers get one tap, everyone else types.
const subscribed = localStorage.getItem('90books_booky_reminder_sub');
$('giveaway-form').hidden = !!subscribed;
$('giveaway-tap').hidden = !subscribed;
$('giveaway-fine').className = 'giveaway-fine';
// Never print a raw ISO date at a reader: "Ends 2026-08-31" is not copy.
// localMidnight() returns a TIMESTAMP, not a Date. Calling a Date method on
// it straight threw inside this function on 2026-08-23, and because
// showEndScreen() calls renderGiveaway(), the throw took the WHOLE win
// screen down in prod. Wrap it, and never assume the return type here.
const endTs = localMidnight(g.end);
const endsOn = endTs
? new Date(endTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
: g.end;
$('giveaway-fine').textContent = subscribed
? `Free, worldwide. Ends ${endsOn}.`
: `Free, worldwide. Ends ${endsOn}. Starts your daily email.`;

card.hidden = false;
return true;
}

function showGiveawayEntered(g) {
localStorage.setItem(GIVEAWAY_ENTERED_KEY, g.tag);
$('giveaway').hidden = true;
$('giveaway-in-sub').textContent =
`winner announced ${g.announce} · 📩 daily reminders on`;
$('giveaway-in').hidden = false;
}

async function enterGiveaway(email, btn, originalLabel) {
const g = activeGiveaway();
if (!g) return;
const fine = $('giveaway-fine');

btn.disabled = true;
btn.textContent = 'entering…';

try {
const res = await fetch('/api/booky-subscribe', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
email,
source: 'giveaway',
giveawayTag: g.tag,
giveawayTitle: g.title,
giveawayAnnounce: g.announce,
giveawayCover: g.cover,
streak: STATS.currentStreak,
stats: statsForServer(),
}),
});
if (!res.ok) throw new Error('subscribe-failed');

// Returning player on a wiped device — give them their record back.
try { restoreStats((await res.json())?.stats); } catch {}

const alreadySubscribed = !!localStorage.getItem('90books_booky_reminder_sub');
localStorage.setItem('90books_booky_reminder_sub', email);

// Keep the historical north-star event comparable, and add a dedicated
// one so entries can be separated from ordinary signups.
posthog.capture('email_signup_completed', {
source: 'booky_endscreen',
giveaway: true,
word_number_at_signup: DAY,
});
posthog.capture('giveaway_entered', {
giveaway: g.tag,
already_subscribed: alreadySubscribed,
word_number: DAY,
});

showGiveawayEntered(g);
} catch {
fine.className = 'giveaway-fine is-error';
fine.textContent = "couldn't save that right now. try again in a sec?";
btn.disabled = false;
btn.textContent = originalLabel;
}
}

function onGiveawaySubmit(e) {
e.preventDefault();
const input = $('giveaway-email');
const fine = $('giveaway-fine');
const email = (input.value || '').trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
fine.className = 'giveaway-fine is-error';
fine.textContent = 'hmm, that email looks off. mind checking it?';
return;
}
enterGiveaway(email, $('giveaway-submit'), 'enter');
}

function onGiveawayTap() {
const email = localStorage.getItem('90books_booky_reminder_sub');
if (!email) return;
enterGiveaway(email, $('giveaway-tap'), '🎟️ count me in');
}

// The stats sheet's signup is a clone of the win screen's, not a second copy
// of the markup. A hand-written duplicate drifted twice in a day: once the
// button label and pitch, once a [type=submit] the shared handler looked for
// and that copy didn't have, which failed silently on a valid email. Cloning
// means one source of truth, so the headline, pitch, button and every toast
// match by construction.
function buildStatsReminder() {
const host = $('reminder-form-stats');
const source = $('reminder-form');
if (!host || !source || host.childElementCount) return;

[...source.children].forEach((node) => {
const copy = node.cloneNode(true);
// Ids must not survive: duplicates would make $() and the win screen's own
// lookups resolve to whichever came first in the document.
copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
copy.removeAttribute('id');
host.appendChild(copy);
});

const btn = host.querySelector('button');
// Inside a sheet's <form method="dialog"> a submit button closes the whole
// sheet, and a `required` input blocks the × until an email is typed. Both
// were live bugs when this sat in Help; strip them from the copy.
if (btn) btn.type = 'button';
host.querySelectorAll('[required]').forEach((el) => el.removeAttribute('required'));

wireReminder(host);
syncStatsReminder();
}

// Mirror the win screen's subscribed state: someone who already signed up
// there should see "daily reminders on" here, not a second ask.
function syncStatsReminder() {
const host = $('reminder-form-stats');
const active = $('reminder-active-stats');
if (!host || !active) return;
const subscribed = !!localStorage.getItem('90books_booky_reminder_sub');
host.style.display = subscribed ? 'none' : 'block';
active.textContent = $('reminder-active')?.textContent || '📩 Daily reminders on';
active.hidden = !subscribed;
}

// The help sheet's own wrapper is a <form method="dialog">, and HTML forbids
// nesting forms — the parser silently drops an inner <form>, so the help copy
// is a <div> and submits through the same code by hand.
function wireReminder(el) {
if (!el) return;
if (el.tagName === 'FORM') {
el.addEventListener('submit', onReminderSubmit);
return;
}
const go = () => onReminderSubmit({ preventDefault() {}, currentTarget: el });
el.querySelector('button')?.addEventListener('click', go);
el.querySelector('input[type="email"]')?.addEventListener('keydown', (ev) => {
if (ev.key === 'Enter') { ev.preventDefault(); go(); }
});
}

async function onReminderSubmit(e) {
e.preventDefault();
// Resolve inside the submitted form, not by id: the same signup now appears
// in two places (win screen and "How to play"), and hardcoded ids would make
// the help copy drive the win screen's fields.
const form = e.currentTarget;
const input = form.querySelector('input[type="email"]');
// Any button in the card: the win screen's is type=submit, the help copy's is
// type=button (it sits inside the sheet's own <form method="dialog">, where a
// submit button would close the sheet). Matching only [type=submit] made this
// null in help, and since this function is async the resulting TypeError was
// swallowed into a rejected promise — the button did nothing, silently.
const btn = form.querySelector('button');
const toast = form.querySelector('.reminder-toast');
const email = (input.value || '').trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
toast.textContent = 'hmm, that email looks off. mind checking it?';
toast.className = 'reminder-toast reminder-error';
toast.hidden = false;
return;
}

const label = btn.textContent;
btn.disabled = true;
btn.textContent = 'saving…';

try {
const res = await fetch('/api/booky-subscribe', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
email,
source: form.dataset.source || 'win-screen',
streak: STATS.currentStreak,
stats: statsForServer(),
}),
});
if (!res.ok) throw new Error('subscribe-failed');

// If this email already has a record, this is a returning player on a device
// with no history. Restoring is the point of the signup for them, so say so
// instead of the generic "you're in".
let restored = false;
try { restored = restoreStats((await res.json())?.stats); } catch {}

localStorage.setItem('90books_booky_reminder_sub', email);
// PostHog: email signup completed
posthog.capture('email_signup_completed', {
// The win screen's form carries no data-source, so it stays 'booky_endscreen'
// and its history is unbroken. Anything else names itself.
source: form.dataset.source ? `booky_${form.dataset.source}` : 'booky_endscreen',
word_number_at_signup: DAY,
});
toast.textContent = restored
? (STATS.currentStreak > 1
? `found you. your ${STATS.currentStreak}-day streak is back, and i'll remind you so it stays that way.`
: "found you. your stats are back, and i'll email you a reminder for tomorrow's word.")
: "you're in. i'll email you a reminder for tomorrow's word.";
toast.className = 'reminder-toast reminder-success';
toast.hidden = false;
// Collapse the form, leaving only the toast.
// Loop rather than three hard querySelectors: `.reminder-pitch` is not in the
// markup, so reading `.style` off null threw here and the headline line after
// it never ran — signing up left "don't lose your streak" sitting above the
// success toast. Missing furniture must not break the collapse.
setTimeout(() => {
['.reminder-row', '.reminder-pitch', '.reminder-headline'].forEach((sel) => {
const el = form.querySelector(sel);
if (el) el.style.display = 'none';
});
}, 600);
} catch {
toast.textContent = "couldn't save right now. try again in a sec?";
toast.className = 'reminder-toast reminder-error';
toast.hidden = false;
btn.disabled = false;
btn.textContent = label;
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
// initiate → bonded → cadet → rider → signet → wingleader → lieutenant → sorceress → valkyrie → champion → high lady → empress → goddess.
// Each tier is hit at `at` days of current streak. Ascending.
const BADGES = [
{ at: 1, icon: '✨', name: 'Initiate', blurb: 'You crossed the veil.' },
{ at: 3, icon: '💫', name: 'Bonded', blurb: 'Three days. Something just clicked.' },
{ at: 7, icon: '🗡️', name: 'Cadet', blurb: 'First week survived. The academy claims you.' },
{ at: 14, icon: '🐉', name: 'Rider', blurb: 'Two weeks. The dragon chose you.' },
{ at: 21, icon: '🌟', name: 'Signet', blurb: 'Your magic woke up.' },
{ at: 30, icon: '🖤', name: 'Wingleader', blurb: 'A month unbroken. The wing follows you.' },
{ at: 45, icon: '⚔️', name: 'Lieutenant', blurb: 'Forty-five days. Commissioned.' },
{ at: 60, icon: '🔮', name: 'Sorceress', blurb: 'Magic mastered. Two months unbroken.' },
{ at: 90, icon: '⚡', name: 'Valkyrie', blurb: 'Ninety days. Chosen for the sky.' },
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

// ---- Book links ----
// ONE definition of where a book points and what the link says, so the win
// screen and the hint sheet can never send the same book to different places.
// Amazon when there is an affiliate URL, otherwise the curated books-like page.
function bookLinkTarget(bookRec) {
if (!bookRec) return null;
if (bookRec.buyUrl) {
return { href: bookRec.buyUrl, text: 'Get it on Amazon \u2192', rel: 'noopener sponsored', retailer: 'amazon' };
}
if (CURATED_SLUGS.has(bookRec.slug)) {
return { href: `https://90books.com/books-like/${bookRec.slug}`, text: 'More books like this \u2192', rel: 'noopener', retailer: null };
}
return null;
}

// Same events the win screen has always fired, so existing dashboards keep
// working and hint-sheet clicks land in the same place as win-screen clicks.
function trackBookLink(bookRec, target) {
const base = {
word_number: DAY,
book: bookRec.slug,
title: bookRec.title,
book_title: bookRec.title,
book_key: bookRec.slug,
source_type: 'booky',
source_page: window.location.pathname || '/booky',
};
if (target.retailer) posthog.capture('affiliate_buy_clicked', { ...base, retailer: target.retailer });
else posthog.capture('booky_books_like_clicked', base);
}

// Wires a text link and the cover link for one book. Used by both screens.
function applyBookLinks(bookRec, linkEl, coverLink) {
const target = bookLinkTarget(bookRec);
if (!target) {
if (linkEl) { linkEl.hidden = true; linkEl.onclick = null; }
if (coverLink) coverLink.onclick = null;
return null;
}
const onClick = () => trackBookLink(bookRec, target);
if (linkEl) {
linkEl.href = target.href;
linkEl.textContent = target.text;
linkEl.rel = target.rel;
linkEl.hidden = false;
linkEl.onclick = onClick;
}
if (coverLink) {
coverLink.href = target.href;
coverLink.rel = target.rel;
coverLink.onclick = onClick;
}
return target;
}

// ---- Hint ----
// The sheet is assembled from components the game already ships: .sheet for the
// container, .share-option for the three rows, .ex-tile for the letters and
// .book-hero for the reveal. Nothing here is a bespoke widget, so the hint
// cannot drift out of step with the rest of the game.
function hintBook() { return DATA?.wordBooks?.[ANSWER] || null; }

// Point at the hint once, for everyone. Not badged as "new": a player who
// arrives next year is meeting it for the first time too, and the callout is
// there to say the control exists, not to date it.
const COACH_KEY = '90books_booky_hint_coach_v1';
function maybeShowHintCoach() {
const coach = $('hint-coach');
if (!coach || !hintBook()) return;
try {
if (localStorage.getItem(COACH_KEY)) return;
} catch { return; }
let timer = 0;
const dismiss = () => {
if (coach.hidden) return;
clearTimeout(timer);
coach.classList.add('coach-out');
// Wait out the fade before hiding, so it doesn't vanish mid-transition.
setTimeout(() => { coach.hidden = true; coach.classList.remove('coach-out'); }, 260);
document.removeEventListener('pointerdown', dismiss);
document.removeEventListener('keydown', dismiss);
try { localStorage.setItem(COACH_KEY, '1'); } catch {}
};

$('hint-coach-close')?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
// Opening the hint is the point of the callout, so it counts as seen.
$('hint-btn')?.addEventListener('click', dismiss);

// It shows once ever, so it must never feel like something to fight. Any tap
// anywhere clears it, so does any key, and it leaves on its own after 6s —
// the × is a fallback, not the way out. The listeners go on after the current
// event finishes, so the tap that opened the page can't dismiss it instantly —
// via setTimeout, not requestAnimationFrame, which never fires while the tab
// is in the background and would leave the callout stuck for those players.
setTimeout(() => {
document.addEventListener('pointerdown', dismiss);
document.addEventListener('keydown', dismiss);
}, 0);
timer = setTimeout(dismiss, 6000);

coach.hidden = false;
posthog.capture('booky_hint_coach_shown', { word_number: DAY, played: STATS.played });
}

function initHint() {
const btn = $('hint-btn');
if (!btn) return;
// The lightbulb is always there. A control that disappears on some days is
// more confusing than a thinner hint, so on a word with no book mapped the
// sheet still opens and says so, rather than the icon vanishing. ship.sh
// blocks that case from ever reaching a player anyway.
renderHints();
maybeShowHintCoach();
}

function renderHints() {
const book = hintBook();
const spoiler = $('hint-spoiler');
const empty = $('hint-empty');
const flair = $('hint-flair-row');
if (!book) {
// Nothing mapped: say so plainly instead of showing an empty veil, and drop
// the spoiler warning with it — there is nothing left to spoil.
if (spoiler) spoiler.hidden = true;
if (flair) flair.hidden = true;
if (empty) {
empty.textContent = 'No book for today\u2019s word.';
empty.hidden = false;
}
return;
}
if (spoiler) spoiler.hidden = false;
if (flair) flair.hidden = false;
const hero = $('hint-book-hero');
if (!hero) return;
// The card is always rendered; the veil is what hides it, so lifting and
// replacing the bar never re-lays-out the sheet.
if (spoiler) spoiler.classList.toggle('open', !!HINTS.book);
const cover = $('hint-cover');
const link = $('hint-cover-link');
if (cover && book.cover) {
// Handler first: a cached failure fires before src assignment returns, and a
// handler attached afterwards would never run, leaving a broken-image icon.
cover.onerror = () => {
if (link) link.hidden = true;
const note = $('hint-empty');
if (note) { note.textContent = 'No cover for today\u2019s book, but the title is below.'; note.hidden = false; }
};
cover.alt = book.title ? `Cover of ${book.title}` : '';
cover.src = book.cover;
if (link) link.hidden = false;
}
$('hint-title').textContent = book.title || '';
$('hint-author').textContent = book.author || '';
applyBookLinks(book, $('hint-cta'), link);
}

function takeBook() {
const book = hintBook();
if (!book) return;
// One way. The card underneath carries the Amazon link, so once the veil is
// lifted a tap belongs to the link, not to putting the cover back.
if (HINTS.book) return;
HINTS.book = true;
saveHints();
renderHints();
// Reveal first, measure second. If analytics is blocked and this throws, the
// player still gets her book.
posthog.capture('booky_hint_book', {
word_number: DAY,
guesses_used: STATE.guesses.length,
answer: ANSWER,
book: book.slug || null,
book_title: book.title || null,
book_author: book.author || null,
});
}

// ---- End screen ----
function preloadBookCover() {
const url = DATA?.wordBooks?.[ANSWER]?.cover;
if (!url) return;
const img = new Image();
img.decoding = 'async';
img.src = url;
}

function hideBookRecCover(cover, coverLink) {
cover.hidden = true;
coverLink.hidden = true;
}

function isAmazonCoverPlaceholder(img) {
return img.naturalWidth < 50 || img.naturalHeight < 50;
}

function loadOpenLibraryCover(cover, coverLink, bookRec, onReady) {
const q = encodeURIComponent(`${bookRec.title} ${bookRec.author}`);
fetch(`https://openlibrary.org/search.json?q=${q}&fields=cover_i&limit=1`)
.then((r) => r.json())
.then((data) => {
const id = data.docs?.[0]?.cover_i;
if (!id) {
hideBookRecCover(cover, coverLink);
onReady?.();
return;
}
cover.onload = () => {
if (isAmazonCoverPlaceholder(cover)) {
hideBookRecCover(cover, coverLink);
} else {
cover.hidden = false;
coverLink.hidden = false;
}
onReady?.();
};
cover.onerror = () => {
hideBookRecCover(cover, coverLink);
onReady?.();
};
cover.src = `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
cover.alt = `${bookRec.title} cover`;
})
.catch(() => {
hideBookRecCover(cover, coverLink);
onReady?.();
});
}

function loadBookRecCover(cover, coverLink, bookRec, onReady) {
hideBookRecCover(cover, coverLink);
if (!bookRec.cover) {
loadOpenLibraryCover(cover, coverLink, bookRec, onReady);
return;
}
cover.onload = () => {
if (isAmazonCoverPlaceholder(cover)) {
loadOpenLibraryCover(cover, coverLink, bookRec, onReady);
return;
}
cover.hidden = false;
coverLink.hidden = false;
onReady?.();
};
cover.onerror = () => loadOpenLibraryCover(cover, coverLink, bookRec, onReady);
cover.src = bookRec.cover;
cover.alt = `${bookRec.title} cover`;
}

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

// Mirror to legacy stats modal (still accessible via the stats icon)
renderStatsModal();

// Hero 2: the word's book. CTA adapts — sponsored buy link, curated page, or none.
const bookRec = DATA.wordBooks?.[ANSWER];
const recEl = $('book-rec');
if (bookRec) {
$('book-rec-title').textContent = bookRec.title;
$('book-rec-author').textContent = bookRec.author;

const cover = $('book-rec-cover');
const coverLink = $('book-rec-cover-link');
const syncCoverLink = () => {
coverLink.hidden = cover.hidden;
};

// One secondary text link under the book (Share is the only primary CTA).
// Wording, destination and tracking all live in applyBookLinks so the hint
// sheet sends this book to exactly the same place.
applyBookLinks(bookRec, $('book-rec-link'), coverLink);

loadBookRecCover(cover, coverLink, bookRec, syncCoverLink);

// Hook line hidden for now (per Olga) — keep the element + data so it can
// be re-enabled later by restoring the `bookRec.hook` conditional.
$('book-rec-hook').hidden = true;
recEl.hidden = false;
} else {
recEl.hidden = true;
}

// Giveaway card — date-driven, so it turns itself on and off with no
// manual flag to remember. While it's live it takes over as the single
// email ask (the reminder form hides below).
const giveawayLive = renderGiveaway();

// Reminder form — hidden if already subscribed, or while the giveaway is
// running (entering the giveaway subscribes you to the same daily email,
// so showing both would ask for the same address twice).
const subscribed = localStorage.getItem('90books_booky_reminder_sub');
const reminderForm = $('reminder-form');
reminderForm.style.display = (subscribed || giveawayLive) ? 'none' : 'block';
$('reminder-active').hidden = !subscribed || giveawayLive;

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

function buildShareString({ clickable = false, omitUrl = false } = {}) {
// The link is DELIBERATELY dead on Reddit and DELIBERATELY live everywhere else.
//
// Reddit (and similar) downrank posts perceived as link self-promotion, so the
// Reddit path keeps the URL as bare plain text: it plants the name for people
// to search (the Wordle move) without tripping anti-link penalties. The Reddit
// MOBILE app already leaves a bare domain as plain text, but the Reddit DESKTOP
// web composer auto-links "90books.com/booky" on paste, so we insert a
// zero-width space (U+200B) inside the ".com" — it still READS as
// "90books.com/booky" but no longer matches a domain.tld pattern.
//
// ⚠️ That protection used to be applied to EVERY share. Measured 2026-08-26:
// 381 of 508 shares were clipboard (pasted into iMessage/WhatsApp/Discord,
// where no self-promotion penalty exists) against 116 Reddit — so 3 out of 4
// shares carried a link the recipient had to retype by hand, for no benefit,
// and social returned ZERO visits in August. Clipboard now gets a real,
// tappable https:// URL; only the Reddit button keeps the dead one.
//
// Web-browser visits still attribute via PostHog's automatic $referrer /
// $referring_domain; the per-path split lives on the booky_share_clicked
// event's `method`.
// ?utm_source=share is what makes a tapped share countable. Without it a link
// opened from iMessage/WhatsApp/Discord arrives with NO referrer and is
// indistinguishable from someone typing the URL, so it lands in $direct and the
// share loop stays unmeasurable (which is exactly why Aug showed 0 social visits).
// The Reddit path stays bare and untagged on purpose — a tracking query is the
// other half of what gets a post read as link self-promotion.
// A CLEAN short link, not a visible tracking query. /s is a 302 to
// /booky?utm_source=share, so attribution survives while the shared text stays
// tidy. This matters because the OS share sheet can send a player to Reddit and
// we get no say in it: a raw "?utm_source=share" tail looked like spam in a
// r/zodiacacademy comment. Keep the redirect in vercel.json in step with this.
// ⚠️ The scheme is REQUIRED, not decoration. A bare "90books.com/play" was
// tried (the squaredle.app look) and Reddit pasted it as dead text — it only
// auto-links a URL with a scheme or a www. prefix, so the copy path lost the
// click while the native path, which carries https:// in its url field, kept it.
// Looks lose to working here.
const shareUrl = clickable
? `https://${SHARE_URL}`
: SITE_URL.replace('.com', '.\u200Bcom');
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
// The book title is deliberately NOT in the share: naming it gave away the
// reveal, so anyone who saw a share had less reason to play. The link is the
// reveal now — which is also worth more to an author than a mention seen by
// people who never opened the game.
// Two trailing spaces before every \n = Reddit hard break; invisible on all other platforms
const HB = '  \n';
// omitUrl is for navigator.share, where the link goes in its own `url` field
// instead of being buried in the text (see onSharePrimary).
const lines = omitUrl
? [header, scoreLine, ...rows]
: [header, scoreLine, ...rows, shareUrl];
// ⚠️ When the URL is omitted, the platform appends it after this text — and it
// joins with a PLAIN newline, which Reddit renders as a soft break, so the link
// ended up on the same line as the last grid row. Ending on the hard-break
// marker makes the appended link start its own line wherever it is pasted.
if (omitUrl) return lines.join(HB) + HB;
return lines.join(HB);
}

function renderStatsModal() {
// The Ward explains the streak, so it lives in Stats rather than in "How to
// play". Worded from the player's actual state: whether she is holding one.
const wardEl = $('stat-ward');
if (wardEl) {
// The full mechanic, moved here from "How to play": what it does AND when it
// comes back. Only the first clause changes with state.
wardEl.innerHTML = STATS.wards > 0
? '\uD83D\uDEE1\uFE0F Ward ready. Miss a day and it saves your streak once. It recharges at your next 7-day mark.'
: '\uD83D\uDEE1\uFE0F Ward used. It saves your streak once, and recharges at your next 7-day mark.';
}

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
  // book/book_title carry the featured book onto share events too, so
  // "players shared a puzzle featuring your book N times" is one group-by
  // rather than a word_number -> book join against a words.json this repo
  // does not own. Same fields as booky_game_complete, deliberately.
  const sharedBook = DATA?.wordBooks?.[ANSWER] || null;
  return {
    word_number: DAY,
    won: STATE.status === 'won',
    guesses_used: STATE.guesses.length,
    streak: STATS.currentStreak,
    book: sharedBook?.slug || null,
    book_title: sharedBook?.title || null,
    book_author: sharedBook?.author || null,
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

// Dormant since 2026-08-27: the win-screen button now shares directly, so
// nothing opens this dialog. Markup and handler are kept rather than deleted
// in case the two-option sheet is wanted back.
function openShareSheet() {
  const sheet = $('share-sheet');
  if (!sheet) return;
  if (typeof sheet.showModal === 'function') sheet.showModal();
}

async function onShareReddit() {
  const text = buildShareString({ clickable: false });
  await copyText(text);
  window.open(REDDIT_DAILY_THREAD, '_blank', 'noopener,noreferrer');
  captureShare('reddit');
  $('share-sheet')?.close();
  showShareToast('Copied! Paste as a comment in r/B00KY 💜');
}

// Wordle's split is by DEVICE, not by capability: phones get the OS share sheet,
// desktop just copies. Chrome and Safari on macOS DO expose navigator.share, so
// feature-detection alone wrongly popped the Mac share sheet on a laptop.
// iPadOS reports itself as "Macintosh", so touch points are what separate an
// iPad (wants the sheet) from a MacBook (wants the clipboard).
function prefersNativeShare() {
  if (typeof navigator.share !== 'function') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPod/i.test(ua)) return true;
  if (/iPad/.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

async function onSharePrimary() {
  // The tagged, tappable string either way, so it unfurls into the OG card
  // wherever it lands.
  const text = buildShareString({ clickable: true });

  if (prefersNativeShare()) {
    try {
      // ⚠️ text and url go in SEPARATE fields on purpose. With the link buried
      // inside `text`, iOS Messages has nothing to build a rich link from and
      // renders the whole thing as plain text — which is exactly what Booky's
      // shares looked like, while a bare Reddit/X link in the same thread got a
      // full card. Passing `url` gives iOS the link to preview while keeping the
      // grid as the message body. The text therefore omits the trailing URL, so
      // apps that append `url` themselves do not print it twice.
      await navigator.share({
        text: buildShareString({ clickable: true, omitUrl: true }),
        url: `https://${SHARE_URL}`,
      });
      captureShare('native');
      $('share-sheet')?.close();
      return;
    } catch (err) {
      // Backing out of the OS sheet throws AbortError. That is a cancel, not a
      // failure: no toast, and it must NOT be counted as a share.
      if (err && err.name === 'AbortError') return;
      // Anything else falls through to the clipboard so the tap still works.
    }
  }

  const ok = await copyText(text);
  if (!ok) return;
  captureShare('clipboard');
  $('share-sheet')?.close();
  showShareToast('Copied! Paste it anywhere 📋');
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

// Pull-to-refresh: body is overflow:hidden (Wordle fit), so the native
// browser gesture never fires. Custom PTR reloads and stays on /booky.
// Marker: ptr-v1
function installPullToRefresh() {
  const THRESHOLD = 72;
  const MAX_PULL = 118;
  const IGNORE = 'input, textarea, select, button, a, [role="button"], .key, dialog, .sheet';

  let indicator = document.getElementById('ptrIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'ptrIndicator';
    indicator.className = 'ptr-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.dataset.ptr = 'v1';
    indicator.innerHTML = '<div class="ptr-indicator-inner"><span class="ptr-spinner" aria-hidden="true"></span><span class="ptr-label">Pull to refresh</span></div>';
    document.body.appendChild(indicator);
  }
  const labelEl = indicator.querySelector('.ptr-label');
  const spinnerEl = indicator.querySelector('.ptr-spinner');

  let startY = 0;
  let armed = false;
  let pulling = false;
  let pull = 0;
  let refreshing = false;

  function dialogOpen() {
    const end = $('end-dialog');
    const share = $('share-sheet');
    if (end && end.open) return true;
    if (share && share.open) return true;
    return false;
  }

  function setPullVisual(dist) {
    const ready = dist >= THRESHOLD;
    indicator.classList.toggle('ptr-visible', dist > 6);
    if (labelEl) labelEl.textContent = refreshing ? 'Refreshing…' : (ready ? 'Release to refresh' : 'Pull to refresh');
    if (spinnerEl && !refreshing) {
      spinnerEl.style.transform = `rotate(${Math.min(360, (dist / THRESHOLD) * 220)}deg)`;
    }
    indicator.style.transform = dist > 6
      ? `translate3d(0, ${Math.min(28, dist * 0.18)}px, 0)`
      : '';
  }

  function resetVisual() {
    if (refreshing) return;
    indicator.classList.remove('ptr-visible', 'ptr-refreshing');
    indicator.style.transform = '';
    if (spinnerEl) spinnerEl.style.transform = '';
    if (labelEl) labelEl.textContent = 'Pull to refresh';
  }

  function doRefresh() {
    refreshing = true;
    indicator.classList.add('ptr-visible', 'ptr-refreshing');
    if (labelEl) labelEl.textContent = 'Refreshing…';
    setTimeout(() => { location.reload(); }, 180);
  }

  function onStart(e) {
    if (refreshing || dialogOpen()) { armed = false; return; }
    if (!e.touches || e.touches.length !== 1) { armed = false; return; }
    if (e.target && e.target.closest && e.target.closest(IGNORE)) { armed = false; return; }
    startY = e.touches[0].clientY;
    armed = true;
    pulling = false;
    pull = 0;
  }

  function onMove(e) {
    if (!armed || refreshing) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) {
      if (pulling) {
        pulling = false;
        pull = 0;
        resetVisual();
      }
      return;
    }
    pull = Math.min(MAX_PULL, dy * 0.5);
    pulling = true;
    if (dy > 10) e.preventDefault();
    setPullVisual(pull);
  }

  function onEnd() {
    if (!armed) return;
    const should = pulling && pull >= THRESHOLD;
    armed = false;
    pulling = false;
    const dist = pull;
    pull = 0;
    if (should) doRefresh();
    else if (dist > 0) resetVisual();
  }

  document.addEventListener('touchstart', onStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onMove, { passive: false, capture: true });
  document.addEventListener('touchend', onEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onEnd, { passive: true, capture: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installPullToRefresh);
} else {
  installPullToRefresh();
}

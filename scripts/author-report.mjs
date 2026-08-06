#!/usr/bin/env node
//
// Booky author report — the "honest clicks report" deliverable.
//
//   node scripts/author-report.mjs 2026-07-27
//   node scripts/author-report.mjs 2026-07-27 --ref heba
//   node scripts/author-report.mjs 2026-07-27 --json
//
// Resolves the featured book from the LIVE queue (/api/booky-words), pulls that
// day's numbers from PostHog, and compares them to the trailing 30-day average
// so the figures have context instead of floating free.
//
// Keyed on DATE, not book_title, so it works on every day Booky has ever run —
// including days before book identity was added to the events (2026-08-03).
//
// Auth: set POSTHOG_PERSONAL_API_KEY (posthog.com > Settings > Personal API
// keys, scope "Query Read"). Without it the script prints a snippet you paste
// into the console of a logged-in us.posthog.com tab, which needs no key.

const PROJECT = '443166';
const WORDS_API = 'https://90books.com/api/booky-words';

const args = process.argv.slice(2);
const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : null;
const asJson = args.includes('--json');

if (!date) {
  console.error('usage: node scripts/author-report.mjs <YYYY-MM-DD> [--ref <utm_source>] [--json]');
  process.exit(1);
}

// Same arithmetic as computeDayNumber() in booky/app.js: local midnight diff,
// 1-indexed. Keep these in step or the report names the wrong book.
function dayNumber(epochStr, target) {
  const [ey, em, ed] = epochStr.split('-').map(Number);
  const [ty, tm, td] = target.split('-').map(Number);
  const a = new Date(ey, em - 1, ed).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

const DAY_SQL = (d) => `
SELECT
  countIf(event='booky_game_start') AS players,
  count(DISTINCT if(event='booky_game_start', person_id, NULL)) AS unique_players,
  countIf(event='booky_game_complete') AS finishers,
  countIf(event='booky_game_complete' AND properties.won) AS wins,
  countIf(event='booky_share_clicked') AS shares,
  countIf(event='affiliate_buy_clicked') AS buy_clicks,
  count(DISTINCT if(event='affiliate_buy_clicked', person_id, NULL)) AS unique_clickers,
  countIf(event='booky_books_like_clicked') AS books_like,
  countIf(event='email_signup_completed') AS signups
FROM events
WHERE toDate(timestamp) = toDate('${d}')
  AND properties.$host NOT LIKE '%localhost%'`;

const BASELINE_SQL = (d) => `
SELECT round(avg(players),1) AS players, round(avg(finishers),1) AS finishers,
       round(avg(shares),1) AS shares, round(avg(buy_clicks),2) AS buy_clicks
FROM (
  SELECT toDate(timestamp) AS day,
    countIf(event='booky_game_start') AS players,
    countIf(event='booky_game_complete') AS finishers,
    countIf(event='booky_share_clicked') AS shares,
    countIf(event='affiliate_buy_clicked') AS buy_clicks
  FROM events
  WHERE timestamp < toDate('${d}') AND timestamp > toDate('${d}') - INTERVAL 30 DAY
    AND properties.$host NOT LIKE '%localhost%'
  GROUP BY day)`;

// utm_medium=author is set by the /heba, /starside, ... redirects in vercel.json.
const REF_SQL = (r) => `
SELECT count() AS hits, count(DISTINCT person_id) AS people
FROM events WHERE properties.utm_medium='author' AND properties.utm_source='${r}'`;

async function hogql(sql, key) {
  const res = await fetch(`https://us.posthog.com/api/environments/${PROJECT}/query/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
  });
  const j = await res.json();
  if (!j.results) throw new Error(j.detail || JSON.stringify(j).slice(0, 300));
  return Object.fromEntries(j.columns.map((c, i) => [c, j.results[0][i]]));
}

function delta(actual, avg) {
  if (!avg) return '';
  const pct = Math.round(((actual - avg) / avg) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs avg`;
}

const row = (label, val, note) =>
  `  ${String(label).padEnd(30)}${String(val).padStart(6)}${note ? '   ' + note : ''}`;

async function main() {
  const words = await fetch(WORDS_API).then((r) => r.json());
  const n = dayNumber(words.epoch, date);
  const word = words.queue?.[n - 1];
  const book = word ? words.wordBooks?.[word] : null;

  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) {
    console.log(`No POSTHOG_PERSONAL_API_KEY set.

Booky #${n} on ${date} — word ${word || '(unknown)'}${book ? ` → ${book.title} by ${book.author}` : ' (no book mapped)'}

Paste this into the console of a logged-in us.posthog.com tab:

(async()=>{const c=document.cookie.match(/posthog_csrftoken=([^;]+)/)?.[1];
const q=async s=>{const r=await fetch('/api/environments/${PROJECT}/query/',{method:'POST',
headers:{'Content-Type':'application/json','X-CSRFToken':c},credentials:'include',
body:JSON.stringify({query:{kind:'HogQLQuery',query:s}})});const j=await r.json();
return Object.fromEntries(j.columns.map((k,i)=>[k,j.results[0][i]]))};
console.table(await q(\`${DAY_SQL(date).replace(/`/g, '')}\`));
console.table(await q(\`${BASELINE_SQL(date).replace(/`/g, '')}\`));})()

Or create a key (Settings > Personal API keys, scope "Query Read") and re-run.`);
    process.exit(2);
  }

  const [d, base, refData] = await Promise.all([
    hogql(DAY_SQL(date), key),
    hogql(BASELINE_SQL(date), key),
    ref ? hogql(REF_SQL(ref), key) : Promise.resolve(null),
  ]);

  if (asJson) {
    console.log(JSON.stringify({ date, day: n, word, book, day_stats: d, baseline: base, ref: refData }, null, 2));
    return;
  }

  const ctr = d.finishers ? ((d.buy_clicks / d.finishers) * 100).toFixed(1) + '%' : 'n/a';
  console.log(`
BOOKY AUTHOR REPORT
${book ? `${book.title} — ${book.author}` : '(no book mapped to this day)'}
Feature day: ${date}  ·  Booky #${n}  ·  word ${word || '?'}

REACH
${row('Players (opened the game)', d.players, delta(d.players, base.players))}
${row('Unique players', d.unique_players)}
${row('Finishers (saw the book)', d.finishers, delta(d.finishers, base.finishers))}
${row('  of which solved it', d.wins)}

ENGAGEMENT
${row('Shares', d.shares, delta(d.shares, base.shares))}
${row('Buy clicks', d.buy_clicks, delta(d.buy_clicks, base.buy_clicks))}
${row('  from unique people', d.unique_clickers)}
${row('Buy-click rate (of finishers)', ctr)}
${row('"More books like this" clicks', d.books_like)}
${row('Email signups that day', d.signups)}
${refData ? '\nYOUR OWN LINK (utm_source=' + ref + ')\n' + row('People arriving from it', refData.people) + '\n' + row('Pageviews from it', refData.hits) : ''}

SAY THIS IN THE EMAIL, IT IS TRUE AND IT BUILDS TRUST
  · Click counts are a conservative floor. Ad blockers suppress some
    tracking, so the real number is equal or higher, never lower.
  · We report reach and clicks. We never report sales — Amazon does not
    disclose which item an affiliate order was, so nobody honestly can.
  · Baseline is the trailing 30 days before this feature day.
`);
}

main().catch((e) => {
  console.error('failed:', e.message);
  process.exit(1);
});

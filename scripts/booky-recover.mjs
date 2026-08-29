#!/usr/bin/env node
// scripts/booky-recover.mjs — find a player's lost stats record and hand them
// a recovery link.
//
// WHO THIS IS FOR: someone with a long streak who got a new phone, or switched
// browsers, and never gave us an email. Their stats are keyed to an anonymous
// cookie that did not survive the move, so nothing automatic can reunite them.
// This is the manual path for the handful who care enough to write in.
//
// HOW IT IDENTIFIES THEM: by the shape of the record. A 40-day streak with 90
// games played is effectively unique in a dataset this size. That only holds
// for players with real histories — which is exactly who this exists for. If
// someone with 3 games played writes in, the search will return a crowd and
// there is nothing worth recovering anyway.
//
// USAGE
//   node scripts/booky-recover.mjs --streak 41
//   node scripts/booky-recover.mjs --played 90 --max-streak 41
//   node scripts/booky-recover.mjs --streak 41 --played 90 --near 3
//
// --near N widens every number by plus or minus N, because people remember
// their streak better than their total games. Default 0 for numbers you pass.
//
// Prints the matching records and, for each, the link to send them. Read-only:
// it never writes, so a wrong guess here cannot damage anybody's stats.

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : null;
};

const want = {
  currentStreak: flag('streak'),
  maxStreak: flag('max-streak'),
  played: flag('played'),
  wins: flag('wins'),
};
const near = flag('near') ?? 0;

if (Object.values(want).every((v) => v === null)) {
  console.error('Give at least one of --streak --max-streak --played --wins');
  console.error('Example: node scripts/booky-recover.mjs --streak 41 --near 2');
  process.exit(1);
}

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REST_URL || !REST_TOKEN) {
  console.error('Missing Redis credentials.');
  console.error('Run with them in the environment, e.g.:');
  console.error('  vercel env pull .env.local && set -a && . ./.env.local && set +a');
  process.exit(1);
}

async function redis(...parts) {
  const r = await fetch(`${REST_URL}/${parts.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
  });
  if (!r.ok) throw new Error(`redis ${r.status} ${await r.text()}`);
  return (await r.json()).result;
}

// SCAN rather than KEYS: KEYS blocks the server for the whole sweep, and this
// runs against the same instance serving live games.
async function allPlayerKeys() {
  const keys = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis('scan', cursor, 'match', 'booky:player:*', 'count', '500');
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

const hit = (actual, target) =>
  target === null || (actual >= target - near && actual <= target + near);

const keys = await allPlayerKeys();
console.log(`Scanned ${keys.length} player records.\n`);

const matches = [];
// Batched: one round trip per 100 records instead of per record.
for (let i = 0; i < keys.length; i += 100) {
  const slice = keys.slice(i, i + 100);
  const raws = await redis('mget', ...slice);
  raws.forEach((raw, n) => {
    if (!raw) return;
    let s;
    try { s = JSON.parse(raw); } catch { return; }
    if (
      hit(s.currentStreak || 0, want.currentStreak) &&
      hit(s.maxStreak || 0, want.maxStreak) &&
      hit(s.played || 0, want.played) &&
      hit(s.wins || 0, want.wins)
    ) matches.push({ id: slice[n].replace('booky:player:', ''), ...s });
  });
}

if (!matches.length) {
  console.log('No record matches. Try --near 3, or ask them for another number.');
  process.exit(0);
}

// Best histories first: the person writing in is almost always near the top.
matches.sort((a, b) => (b.played || 0) - (a.played || 0));

console.log(`${matches.length} match${matches.length === 1 ? '' : 'es'}:\n`);
for (const m of matches.slice(0, 15)) {
  console.log(`  streak ${m.currentStreak}  max ${m.maxStreak}  played ${m.played}  wins ${m.wins}  last day ${m.lastPlayedDay}`);
  console.log(`  https://90books.com/booky?restore=${m.id}\n`);
}

if (matches.length > 15) console.log(`(${matches.length - 15} more not shown — narrow it with another number.)`);
if (matches.length > 1) {
  console.log('More than one match: ask them for a second number (games played, or');
  console.log('their best streak) before sending a link. Sending the wrong one gives');
  console.log('them somebody else’s totals, and the merge only ever raises numbers,');
  console.log('so it cannot be undone by sending the right one afterwards.');
}

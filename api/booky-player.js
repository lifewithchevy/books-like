// api/booky-player.js — keeps every player's stats alive, with no account,
// no email and no install.
//
// THE PROBLEM: stats live in localStorage, and WebKit deletes a site's
// script-writable storage — LocalStorage, SessionStorage, IndexedDB, service
// worker registrations and cache — after 7 days of Safari use without
// interaction on the site. 61 of the 63 loyal non-subscribers are on mobile,
// so that rule is the main reason streaks disappear.
//
// THE WAY AROUND IT: a cookie set by the SERVER in an HTTP response is not
// script-writable storage. It is not in WebKit's deletion list and follows its
// own Max-Age. So we hand each player an anonymous id in a server-set cookie
// and keep their stats in Redis keyed by that id. When localStorage is wiped,
// the cookie survives, the next page load presents the id, and the stats come
// back on their own — silently, for everyone, subscribed or not.
//
// The cookie is HttpOnly: the page never reads it, which both keeps it out of
// script-writable territory and means a stolen XSS payload cannot lift it.
//
// WHAT THIS DOES NOT COVER, and nothing account-free can:
//   - the player clearing cookies / "Clear History and Website Data"
//   - a new phone or a different browser
//   - private browsing
// Those need something the player carries: an email (already shipped, see
// api/booky-subscribe.js) or a restore code.
//
// PRIVACY: the id is a random UUID. It is not derived from anything about the
// player, is never used cross-site, and the record holds nothing but game
// counters — no email, no name, no IP. Records expire if unused (TTL below).

const { enforce } = require('./_rate-limit');

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const COOKIE = 'bk_pid';
// Two years. Long enough that a seasonal player keeps their streak, short
// enough that a record nobody touches does not live forever.
const COOKIE_MAX_AGE = 63072000;
// Redis TTL is refreshed on every write, so this only expires records that
// genuinely stopped being used.
const RECORD_TTL = 60 * 60 * 24 * 400;

async function redis(...args) {
  const path = args.map((a) => encodeURIComponent(a)).join('/');
  const r = await fetch(`${REST_URL}/${path}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    signal: AbortSignal.timeout(1500),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// Ids we minted are UUIDs. Anything else came from a client that made it up,
// and letting arbitrary strings through would turn this into a key-value store
// anyone can scribble in.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
};

function cleanStats(s) {
  const o = s || {};
  return {
    currentStreak: num(o.currentStreak),
    maxStreak: num(o.maxStreak),
    played: num(o.played),
    wins: num(o.wins),
    lastPlayedDay: num(o.lastPlayedDay),
  };
}

// Keep the best record we have ever seen for this player.
//
// Totals only ever go up, so a device whose storage was just wiped cannot
// overwrite a good record with zeros on its first load — which is precisely
// the moment this feature exists for. The current streak follows whichever
// side played more recently, because that side knows whether the streak
// survived; ties go to the higher streak.
function mergeRecords(stored, incoming) {
  if (!stored) return incoming;
  const newer = incoming.lastPlayedDay >= stored.lastPlayedDay;
  return {
    maxStreak: Math.max(stored.maxStreak, incoming.maxStreak),
    played: Math.max(stored.played, incoming.played),
    wins: Math.max(stored.wins, incoming.wins),
    lastPlayedDay: Math.max(stored.lastPlayedDay, incoming.lastPlayedDay),
    currentStreak:
      incoming.lastPlayedDay === stored.lastPlayedDay
        ? Math.max(stored.currentStreak, incoming.currentStreak)
        : (newer ? incoming.currentStreak : stored.currentStreak),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://90books.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Called on load and on finish, so the ceiling is higher than the signup
  // endpoints'. Fails open like the rest — losing a streak restore is worse
  // than serving one extra request.
  if (await enforce(req, res, { name: 'player', limit: 120 })) return;

  // Reuse the player's id if they have one, otherwise mint one and hand it
  // back in a server-set cookie. Set-Cookie on every response refreshes the
  // Max-Age, so an active player's cookie never ages out.
  let pid = readCookie(req, COOKIE);
  let isNew = false;
  if (!pid || !UUID_RE.test(pid)) {
    pid = require('crypto').randomUUID();
    isNew = true;
  }
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${pid}; Max-Age=${COOKIE_MAX_AGE}; Path=/; Secure; HttpOnly; SameSite=Lax`
  );

  // No store configured — still hand out the cookie so ids stay stable, and
  // tell the client there is nothing to restore.
  if (!REST_URL || !REST_TOKEN) {
    res.status(200).json({ ok: true, stats: null, source: 'no-store' });
    return;
  }

  const incoming = cleanStats(req.body && req.body.stats);
  const key = `booky:player:${pid}`;

  // MANUAL RECOVERY. A player on a brand-new device has a new cookie and no
  // way to prove who they were — nothing anonymous survives a new phone. For
  // the loyal handful who care enough to write in, we look their old record up
  // by its shape (scripts/booky-find-player.mjs) and send them a one-time link
  // carrying its id. Opening it merges that record into this device's.
  //
  // Deliberately invisible: no UI, no discoverable entry point. The id is a
  // random UUID, so the link cannot be guessed, and it only exists if we sent
  // it. Merging is additive — totals only climb and nothing is deleted — so
  // the worst a misused link can do is inflate the holder's own counters.
  const claim = req.body && req.body.restore;
  let claimed = null;
  if (claim && UUID_RE.test(claim) && claim !== pid) {
    try {
      const raw = await redis('get', `booky:player:${claim}`);
      if (raw) claimed = cleanStats(JSON.parse(raw));
    } catch (err) {
      console.error('[booky-player] restore read failed:', err);
    }
  }

  try {
    let stored = null;
    if (!isNew) {
      const raw = await redis('get', key);
      if (raw) {
        try { stored = cleanStats(JSON.parse(raw)); } catch { stored = null; }
      }
    }

    // The claimed record folds in exactly like another device would: through
    // the same merge, so it can only raise totals, never cut them down.
    const merged = mergeRecords(mergeRecords(stored, incoming), claimed || incoming);

    // Only write when the record actually changed. A returning player's first
    // load of the day is otherwise a pointless write on every page view.
    if (!stored || JSON.stringify(stored) !== JSON.stringify(merged)) {
      await redis('set', key, JSON.stringify(merged), 'EX', String(RECORD_TTL));
    } else {
      await redis('expire', key, String(RECORD_TTL));
    }

    res.status(200).json({
      ok: true,
      // Nothing to restore for a player we have never seen — saying so lets
      // the client tell "new here" apart from "we could not read it".
      stats: (stored || claimed) ? merged : null,
      source: claimed ? 'restored' : (stored ? 'stored' : (isNew ? 'new-player' : 'no-record')),
    });
  } catch (err) {
    console.error('[booky-player] store failed:', err);
    // Never fail the client: this runs on page load, and the game must not
    // depend on it.
    res.status(200).json({ ok: true, stats: null, source: 'error' });
  }
};

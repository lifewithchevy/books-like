// lib/daily-trigger.js — the "may I send today's reminder?" gate.
//
// Why this exists: Vercel Cron cannot be used on this project. Its registration
// froze on 2026-07-16 pinned to a deployment from 2026-07-15, so for a month the
// daily reminder was built by month-old code (dead unsubscribe link, missing
// update notes) while 90books.com served current code. Changing the schedule in
// vercel.json, DELETING the crons block entirely, disabling the feature and
// redeploying — none of it moved the pin. Vercel Cron is now DISABLED for this
// project and the send is driven by scripts/health-live.mjs instead, which
// booky-health.yml already runs on a schedule.
//
// That trigger is a plain unauthenticated GET, so this gate is what keeps it
// honest. Two locks, both required:
//
//   1. TIME WINDOW — 22:00 UTC through 03:59 UTC.
//   2. ONCE PER DAY — a Redis SET NX keyed to the send's date. Whoever wins the
//      key sends; everyone else is told it already happened.
//
// The window is SIX hours because GitHub's scheduled runs are nothing like
// punctual. booky-health.yml is `17 */3 * * *`, so its slots are 21:17 and
// 00:17 UTC — there is no 23:17 slot, despite the old Vercel cron having run at
// 23:00. Measured delays on the last six runs were 46, 60, 87, 94, 105 and 149
// minutes. So the 21:17 slot actually lands somewhere around 22:00-23:47 and is
// the one that normally sends; the 00:17 slot lands around 01:00-02:47 and is
// the backup for a night the first one drifts past the edge.
//
// 04:00 UTC is a hard edge on purpose: that is midnight Eastern, and the email
// says "today's word is waiting". Past that the message is wrong for the US
// readers who are most of the list.
//
// Worst case for a stranger who finds the URL: they cause the day's email to go
// out a few minutes earlier than it otherwise would. They cannot send it twice,
// cannot send it outside the window, and cannot change a word of it.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

// The send "belongs" to the day the 22:00 window opened. A run that lands at
// 01:40 UTC is still finishing YESTERDAY's send, and must not be allowed to
// take today's slot as well — otherwise a late run and the next evening's run
// would both fire inside 24 hours.
function sendDateKey(now = new Date()) {
  const d = new Date(now.getTime());
  if (d.getUTCHours() < 4) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function inWindow(now = new Date()) {
  const h = now.getUTCHours();
  return h >= 22 || h < 4;
}

// SET key 1 NX EX 129600  → "1" when we won it, null when someone already has it.
// 36h TTL: longer than the window so a retry inside the same window is blocked,
// short enough that the key is gone well before the next day's window opens.
async function claim(key) {
  const path = ['SET', key, '1', 'NX', 'EX', '129600']
    .map(encodeURIComponent).join('/');
  const r = await fetch(`${REST_URL}/${path}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result !== null;
}

/**
 * @returns {Promise<{go: boolean, reason: string, dateKey: string}>}
 *   go:true means the caller owns today's send and must actually do it.
 */
async function maySend(now = new Date()) {
  const dateKey = sendDateKey(now);

  if (!inWindow(now)) {
    return { go: false, reason: 'outside the 22:00-04:00 UTC window', dateKey };
  }

  // FAILS CLOSED, unlike api/_rate-limit.js. There the cost of failing open is
  // one unmetered request; here it is a duplicate email to the whole list, so
  // an unreachable store must mean "do not send".
  if (!REST_URL || !REST_TOKEN) {
    return { go: false, reason: 'no lock store configured — refusing to send unlocked', dateKey };
  }

  try {
    const won = await claim(`booky:daily-send:${dateKey}`);
    return won
      ? { go: true,  reason: 'claimed the day', dateKey }
      : { go: false, reason: 'already sent today', dateKey };
  } catch (err) {
    return { go: false, reason: `lock store unreachable (${err.message})`, dateKey };
  }
}

module.exports = { maySend, sendDateKey, inWindow };

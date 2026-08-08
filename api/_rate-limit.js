// api/_rate-limit.js — per-IP rate limiting for the public write endpoints.
//
// Files under api/ whose name starts with "_" are not routed by Vercel, so this
// is a shared helper, not an endpoint.
//
// Why this exists: /api/booky-subscribe, /api/feedback and /api/suggest are
// unauthenticated POSTs that each spend something real — a Resend contact (paid
// plan, and the audience is the whole email business), an Airtable row, an
// outbound email. Nothing stopped a script from calling any of them in a loop.
// The failure mode is not a crash, it is a quota bill and a polluted list.
//
// Storage is the same Upstash/Vercel KV store api/vote.js already uses, via a
// fixed window: INCR a per-IP key, EXPIRE it on first write. A fixed window can
// let through up to 2x the limit across a boundary; that is fine here, the goal
// is to stop loops and bots, not to meter precisely.
//
// FAILS OPEN, always. If the store is unconfigured, slow, or erroring, requests
// are allowed. A signup is worth more than a perfectly enforced limit, and this
// must never be the reason the game's main conversion path breaks.

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

// Vercel sets x-forwarded-for; the client-controlled part is appended, so the
// FIRST entry is the real edge-observed IP.
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

async function redis(...args) {
  const path = args.map((a) => encodeURIComponent(a)).join('/');
  const r = await fetch(`${REST_URL}/${path}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    signal: AbortSignal.timeout(1500),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

/**
 * @returns {Promise<{ok: boolean, remaining: number, retryAfter: number}>}
 *   ok:false means the caller should answer 429. Always {ok:true} when the
 *   store is unavailable.
 */
async function rateLimit(req, { name, limit, windowSeconds = 3600 }) {
  if (!REST_URL || !REST_TOKEN) return { ok: true, remaining: limit, retryAfter: 0 };
  try {
    const ip = clientIp(req);
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `rl:${name}:${bucket}:${ip}`;
    const count = Number(await redis('INCR', key)) || 0;
    if (count === 1) await redis('EXPIRE', key, String(windowSeconds));
    if (count > limit) {
      const retryAfter = (bucket + 1) * windowSeconds - Math.floor(Date.now() / 1000);
      return { ok: false, remaining: 0, retryAfter: Math.max(retryAfter, 1) };
    }
    return { ok: true, remaining: limit - count, retryAfter: 0 };
  } catch (e) {
    console.error(`[rate-limit] ${name} check skipped:`, e && e.message);
    return { ok: true, remaining: limit, retryAfter: 0 };
  }
}

/**
 * Applies the limit and, when exceeded, writes a 429 and returns true so the
 * caller can `if (await enforce(...)) return;`.
 */
async function enforce(req, res, opts) {
  const r = await rateLimit(req, opts);
  if (r.ok) return false;
  res.setHeader('Retry-After', String(r.retryAfter));
  res.status(429).json({ error: 'Too many requests, try again shortly' });
  return true;
}

module.exports = { rateLimit, enforce, clientIp };

// lib/selftest.js — does the email lifecycle still actually work?
//
// WHY THIS EXISTS: the footer unsubscribe link was broken from 22 to 29 Sep
// 2026 — seven days — and nothing noticed. `ship.sh` was green the whole time,
// because every check we had looks at the GAME: the queue, the dictionary,
// app.js. Nothing ever exercised confirm or unsubscribe, so a 422 from Resend
// that made "Something went wrong" appear for every reader who tried to opt out
// was invisible until a human went looking for something else entirely.
//
// This walks the real lifecycle, through the real HTTP endpoints, with real
// signed links, and asserts the contact actually moved:
//
//   pending  --confirm link-->  confirmed  --unsubscribe link-->  unsubscribed
//
// scripts/health-live.mjs calls it every 3 hours and fails the run if any step
// breaks, so the blast radius of a bug like that is hours, not a week.
//
// ⚠️ IT NEVER TOUCHES A REAL PERSON. The subject is a hardcoded address on our
// own domain and the `e` parameter is ignored, so this endpoint cannot be
// pointed at a subscriber. It also never goes near api/booky-subscribe's send
// path, so it emails nobody: the contact is seeded by writing to Resend
// directly, and confirm/unsubscribe do not send mail.

const TEST_EMAIL = 'selftest@90books.com';

const BASE = 'https://90books.com';

async function readContact(key, aud) {
  const r = await fetch(
    `https://api.resend.com/audiences/${aud}/contacts/${encodeURIComponent(TEST_EMAIL)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.data && j.data.email ? j.data : j;
}

module.exports = async (req, res) => {
  const key = process.env.RESEND_API_KEY;
  const aud = process.env.RESEND_AUDIENCE_ID;
  const steps = [];
  const fail = (step, detail) => { steps.push({ step, ok: false, detail }); };
  const pass = (step, detail) => { steps.push({ step, ok: true, detail }); };

  if (!key || !aud) {
    res.status(500).json({ ok: false, steps: [{ step: 'env', ok: false, detail: 'Resend env missing' }] });
    return;
  }

  try {
    // 1. Seed as pending, exactly as a new signup is stored.
    const seed = await fetch(`https://api.resend.com/audiences/${aud}/contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, unsubscribed: true, first_name: '0|0|0|0|0' }),
    });
    if (!seed.ok && seed.status !== 422) fail('seed', `create returned ${seed.status}`);
    else {
      // The create upserts, but only for a brand-new contact; force the state.
      await fetch(`https://api.resend.com/audiences/${aud}/contacts/${encodeURIComponent(TEST_EMAIL)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ unsubscribed: true }),
      });
      pass('seed', 'test contact is pending');
    }

    // 2. The confirm link must actually confirm. This is the step that was
    //    silently 500ing for a week in Sep 2026.
    const { confirmUrl } = require('./confirm');
    const cr = await fetch(confirmUrl(TEST_EMAIL), { redirect: 'manual' });
    if (cr.status !== 200) fail('confirm', `confirm link returned ${cr.status}`);
    else {
      const c = await readContact(key, aud);
      if (!c) fail('confirm', 'contact unreadable after confirm');
      else if (c.unsubscribed !== false) fail('confirm', 'confirm returned 200 but contact is still not subscribed');
      else pass('confirm', 'confirm link subscribed the contact');
    }

    // 3. The unsubscribe link must actually unsubscribe. This is the exact bug
    //    that went unnoticed: a 422 from Resend surfaced as "Something went
    //    wrong" and the reader stayed on the list.
    const { sign } = require('./unsubscribe');
    const ur = await fetch(
      `${BASE}/api/booky-subscribe?unsub=1&e=${encodeURIComponent(TEST_EMAIL)}&t=${sign(TEST_EMAIL)}`,
      { redirect: 'manual' }
    );
    if (ur.status !== 200) fail('unsubscribe', `unsubscribe link returned ${ur.status}`);
    else {
      const c = await readContact(key, aud);
      if (!c) fail('unsubscribe', 'contact unreadable after unsubscribe');
      else if (c.unsubscribed !== true) fail('unsubscribe', 'unsubscribe returned 200 but contact is still subscribed');
      else pass('unsubscribe', 'unsubscribe link removed the contact');
    }

    // 4. The dashboard label follows along. Cosmetic, so it is reported but
    //    never the thing that fails the run.
    const c = await readContact(key, aud);
    // `properties` comes back as an object of {value,...} per key, not a flat
    // string map, so `.status` alone stringifies to [object Object].
    const raw = c && c.properties && c.properties.status;
    const label = raw && typeof raw === 'object' ? raw.value : raw;
    steps.push({ step: 'status-label', ok: true, detail: `status property = ${label || 'unset'}`, cosmetic: true });
  } catch (err) {
    fail('exception', String(err && err.message ? err.message : err));
  }

  const ok = steps.every((s) => s.ok || s.cosmetic);
  res.status(ok ? 200 : 500).json({ ok, email: TEST_EMAIL, steps });
};

module.exports.TEST_EMAIL = TEST_EMAIL;

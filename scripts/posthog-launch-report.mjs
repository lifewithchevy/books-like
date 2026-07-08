#!/usr/bin/env node
/**
 * Pull PostHog metrics since launch and write a self-contained HTML dashboard.
 *
 * Usage:
 *   POSTHOG_PERSONAL_API_KEY=phx_... node scripts/posthog-launch-report.mjs
 *   POSTHOG_PERSONAL_API_KEY=phx_... node scripts/posthog-launch-report.mjs --out ./report.html
 *
 * Optional env:
 *   POSTHOG_HOST=https://us.i.posthog.com  (default)
 *   POSTHOG_PROJECT_ID=12345               (auto-detected if omitted)
 *   LAUNCH_DATE=2026-05-31                 (default)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const HOST = (process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_API_KEY;
const LAUNCH_DATE = process.env.LAUNCH_DATE || '2026-05-31';
const outArg = process.argv.indexOf('--out');
const OUT_PATH = resolve(outArg >= 0 ? process.argv[outArg + 1] : '/opt/cursor/artifacts/posthog-launch-report.html');

if (!API_KEY) {
  console.error('Missing POSTHOG_PERSONAL_API_KEY.');
  console.error('Create one in PostHog → Settings → Personal API keys (Query Read).');
  process.exit(1);
}

async function phFetch(path, opts = {}) {
  const res = await fetch(`${HOST}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`PostHog ${path} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function hogQuery(projectId, sql, name) {
  const data = await phFetch(`/api/projects/${projectId}/query/`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      query: { kind: 'HogQLQuery', query: sql },
    }),
  });
  if (!data.results) throw new Error(`No results for ${name}`);
  return { columns: data.columns || [], rows: data.results };
}

async function getProjectId() {
  if (process.env.POSTHOG_PROJECT_ID) return process.env.POSTHOG_PROJECT_ID;
  const projects = await phFetch('/api/projects/');
  const list = projects.results || projects;
  if (!Array.isArray(list) || !list.length) throw new Error('No PostHog projects found for this API key');
  if (list.length === 1) return String(list[0].id);
  const named = list.find(p => /90books|booky/i.test(p.name || ''));
  return String((named || list[0]).id);
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function pct(num, den) {
  if (!den) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

function barChart(items, { maxBars = 14, valueKey = 'value', labelKey = 'label' } = {}) {
  const slice = items.slice(0, maxBars);
  const max = Math.max(...slice.map(d => d[valueKey] || 0), 1);
  return slice.map(d => {
    const w = Math.round(((d[valueKey] || 0) / max) * 100);
    return `<div class="bar-row"><span class="bar-label">${esc(d[labelKey])}</span><div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div><span class="bar-val">${fmt(d[valueKey])}</span></div>`;
  }).join('');
}

function sparkline(points) {
  if (!points.length) return '<p class="muted">No data</p>';
  const w = 640, h = 120, pad = 8;
  const max = Math.max(...points.map(p => p.value), 1);
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - ((p.value / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  const area = `${pad},${h - pad} ${coords.join(' ')} ${pad + (points.length - 1) * step},${h - pad}`;
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Daily visitors trend"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d946a8" stop-opacity="0.35"/><stop offset="100%" stop-color="#d946a8" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#g)"/><polyline points="${coords.join(' ')}" fill="none" stroke="#8b3fd3" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

async function main() {
  const projectId = await getProjectId();
  const since = `${LAUNCH_DATE} 00:00:00`;
  const filter = `timestamp >= toDateTime('${since}')`;

  const [
    summary,
    dailyVisitors,
    keyEvents,
    utmCampaigns,
    topPages,
    bookyFunnel,
  ] = await Promise.all([
    hogQuery(projectId, `
      SELECT
        count() AS pageviews,
        count(DISTINCT person_id) AS unique_visitors,
        countIf(event = 'booky_game_start') AS game_starts,
        countIf(event = 'booky_game_complete') AS game_completes,
        countIf(event = 'booky_share_clicked') AS shares,
        countIf(event = 'affiliate_buy_clicked') AS affiliate_clicks,
        countIf(event = 'goodreads_connected') AS gr_connects,
        countIf(event = 'email_signup_completed') AS email_signups
      FROM events
      WHERE ${filter}
    `, 'launch summary'),

    hogQuery(projectId, `
      SELECT toDate(timestamp) AS day, count(DISTINCT person_id) AS visitors
      FROM events
      WHERE ${filter} AND event = '$pageview'
      GROUP BY day
      ORDER BY day
    `, 'daily visitors'),

    hogQuery(projectId, `
      SELECT event, count() AS total
      FROM events
      WHERE ${filter}
        AND event IN (
          '$pageview',
          'booky_game_start',
          'booky_game_complete',
          'booky_share_clicked',
          'booky_books_like_clicked',
          'affiliate_buy_clicked',
          'goodreads_connected',
          'email_signup_completed'
        )
      GROUP BY event
      ORDER BY total DESC
    `, 'key events'),

    hogQuery(projectId, `
      SELECT
        coalesce(nullIf(properties.utm_campaign, ''), '(none)') AS campaign,
        count() AS visits,
        count(DISTINCT person_id) AS visitors
      FROM events
      WHERE ${filter} AND event = '$pageview'
      GROUP BY campaign
      ORDER BY visits DESC
      LIMIT 12
    `, 'utm campaigns'),

    hogQuery(projectId, `
      SELECT
        coalesce(nullIf(properties.$pathname, ''), '/') AS path,
        count() AS views
      FROM events
      WHERE ${filter} AND event = '$pageview'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `, 'top pages'),

    hogQuery(projectId, `
      SELECT
        toDate(timestamp) AS day,
        countIf(event = 'booky_game_start') AS starts,
        countIf(event = 'booky_game_complete') AS completes
      FROM events
      WHERE ${filter}
      GROUP BY day
      ORDER BY day
    `, 'booky funnel daily'),
  ]);

  const s = Object.fromEntries(summary.columns.map((c, i) => [c, summary.rows[0]?.[i]]));
  const pageviews = Number(s.pageviews || 0);
  const visitors = Number(s.unique_visitors || 0);
  const starts = Number(s.game_starts || 0);
  const completes = Number(s.game_completes || 0);
  const shares = Number(s.shares || 0);
  const affiliate = Number(s.affiliate_clicks || 0);
  const gr = Number(s.gr_connects || 0);
  const emails = Number(s.email_signups || 0);

  const daily = dailyVisitors.rows.map(r => ({ day: r[0], value: Number(r[1]) }));
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const last7sum = last7.reduce((a, b) => a + b.value, 0);
  const prev7sum = prev7.reduce((a, b) => a + b.value, 0);
  const wow = prev7sum ? ((last7sum - prev7sum) / prev7sum) * 100 : null;

  const eventRows = keyEvents.rows.map(r => ({ event: r[0], total: Number(r[1]) }));
  const utmRows = utmCampaigns.rows.map(r => ({ label: r[0], visits: Number(r[1]), visitors: Number(r[2]) }));
  const pageRows = topPages.rows.map(r => ({ label: r[0], value: Number(r[1]) }));

  const funnelDaily = bookyFunnel.rows.map(r => ({
    day: r[0],
    starts: Number(r[1]),
    completes: Number(r[2]),
  }));
  const recentFunnel = funnelDaily.slice(-14);
  const funnelBars = recentFunnel.map(d => ({
    label: d.day,
    value: d.starts,
    sub: d.completes,
  }));

  const generated = new Date().toISOString();
  const periodEnd = daily.length ? daily[daily.length - 1].day : 'today';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>90books launch report · May 31 → ${esc(periodEnd)}</title>
<style>
  :root { --bg:#faf8fc; --card:#fff; --text:#1a1a1a; --muted:#666; --accent:#d946a8; --accent2:#8b3fd3; --border:#ece6ef; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: Inter, system-ui, sans-serif; background:var(--bg); color:var(--text); padding:32px 20px 64px; }
  .wrap { max-width: 980px; margin: 0 auto; }
  h1 { font-family: Georgia, serif; font-size: 2rem; margin-bottom: 6px; }
  .sub { color:var(--muted); margin-bottom: 28px; }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:14px; margin-bottom: 24px; }
  .kpi { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px; }
  .kpi .label { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:8px; }
  .kpi .num { font-size:28px; font-weight:700; line-height:1; }
  .kpi .hint { font-size:12px; color:var(--muted); margin-top:8px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:22px; margin-bottom:18px; }
  .card h2 { font-size:1.05rem; margin-bottom:14px; }
  .spark { width:100%; height:auto; display:block; }
  .bar-row { display:grid; grid-template-columns: 120px 1fr 56px; gap:10px; align-items:center; margin:8px 0; font-size:13px; }
  .bar-label { color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .bar-track { background:#f1eaf5; border-radius:999px; height:10px; overflow:hidden; }
  .bar-fill { height:100%; background:linear-gradient(90deg, var(--accent), var(--accent2)); border-radius:999px; }
  .bar-val { text-align:right; font-weight:600; }
  .two { display:grid; grid-template-columns: 1fr 1fr; gap:18px; }
  .pill { display:inline-block; background:#f6ecf3; color:#8b3fd3; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; }
  .muted { color:var(--muted); font-size:13px; }
  .score { font-size:2.4rem; font-weight:800; background:linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  @media (max-width:720px) { .two { grid-template-columns:1fr; } .bar-row { grid-template-columns: 90px 1fr 48px; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>90books · since launch</h1>
  <p class="sub">${esc(LAUNCH_DATE)} → ${esc(periodEnd)} · generated ${esc(generated.slice(0, 16).replace('T', ' '))} UTC</p>

  <div class="card" style="text-align:center;padding:28px">
    <div class="pill">Headline</div>
    <p class="score" style="margin:12px 0 6px">${fmt(visitors)}</p>
    <p style="font-size:1.1rem;margin-bottom:6px">unique visitors since May 31</p>
    <p class="muted">${fmt(pageviews)} pageviews · ${fmt(starts)} Booky games started · ${pct(completes, starts)} finish rate</p>
    ${wow != null ? `<p class="muted" style="margin-top:8px">Last 7 days vs prior 7: <strong>${wow >= 0 ? '+' : ''}${wow.toFixed(0)}%</strong> unique visitors</p>` : ''}
  </div>

  <div class="grid">
    <div class="kpi"><div class="label">Pageviews</div><div class="num">${fmt(pageviews)}</div></div>
    <div class="kpi"><div class="label">Unique visitors</div><div class="num">${fmt(visitors)}</div></div>
    <div class="kpi"><div class="label">Booky starts</div><div class="num">${fmt(starts)}</div><div class="hint">${pct(completes, starts)} complete</div></div>
    <div class="kpi"><div class="label">Shares</div><div class="num">${fmt(shares)}</div><div class="hint">${pct(shares, completes)} of wins</div></div>
    <div class="kpi"><div class="label">Affiliate clicks</div><div class="num">${fmt(affiliate)}</div></div>
    <div class="kpi"><div class="label">Goodreads</div><div class="num">${fmt(gr)}</div></div>
    <div class="kpi"><div class="label">Email signups</div><div class="num">${fmt(emails)}</div></div>
  </div>

  <div class="card">
    <h2>Daily unique visitors</h2>
    ${sparkline(daily)}
  </div>

  <div class="two">
    <div class="card">
      <h2>Booky funnel (last 14 days)</h2>
      <p class="muted" style="margin-bottom:10px">Bar = starts · number = completes that day</p>
      ${barChart(funnelBars.map(d => ({ label: d.label, value: d.value })), { maxBars: 14 })}
    </div>
    <div class="card">
      <h2>Traffic sources (utm_campaign)</h2>
      ${barChart(utmRows.map(r => ({ label: r.label, value: r.visits })))}
    </div>
  </div>

  <div class="two">
    <div class="card">
      <h2>Key events</h2>
      ${barChart(eventRows.map(r => ({ label: r.event.replace(/^\$/, ''), value: r.total })))}
    </div>
    <div class="card">
      <h2>Top pages</h2>
      ${barChart(pageRows)}
    </div>
  </div>

  <p class="muted" style="margin-top:20px">Source: PostHog project ${esc(projectId)} · Run <code>node scripts/posthog-launch-report.mjs</code> to refresh.</p>
</div>
</body>
</html>`;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, html, 'utf8');

  const jsonPath = OUT_PATH.replace(/\.html?$/, '.json');
  writeFileSync(jsonPath, JSON.stringify({
    generated,
    launchDate: LAUNCH_DATE,
    periodEnd,
    summary: { pageviews, visitors, starts, completes, shares, affiliate, gr, emails },
    daily,
    utmRows,
    pageRows,
    eventRows,
  }, null, 2));

  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(JSON.stringify({ pageviews, visitors, starts, completes, shares, affiliate }, null, 2));
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

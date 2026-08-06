#!/usr/bin/env node
/**
 * Vercel production health check for Cloud Agents.
 *
 * Token sources (any one works):
 *   - GitHub Actions: secrets.VERCEL_TOKEN (vercel-status workflow)
 *   - Cursor Cloud Agents: dashboard → Secrets → VERCEL_TOKEN
 *
 * Usage: node scripts/vercel-status.mjs [--logs]
 */

const TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = process.env.VERCEL_ORG_ID || 'team_wSIVDUUd5X2zNAVCEshu4PDl';
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_i6QIlyGNgvBL0jBJEB8dpI0vdB10';
const SHOW_LOGS = process.argv.includes('--logs');

const ROUTES = ['/', '/booky', '/books-like/from-blood-and-ash', '/genre/romantasy'];
const SITE = 'https://90books.com';

async function vercel(path, opts = {}) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (TEAM_ID) url.searchParams.set('teamId', TEAM_ID);
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error?.message || body.message || res.statusText;
    throw new Error(`${res.status} ${path}: ${msg}`);
  }
  return body;
}

async function checkLiveRoutes() {
  console.log('\n── Live routes (90books.com) ──');
  const results = [];
  for (const route of ROUTES) {
    const url = `${SITE}${route}`;
    const start = Date.now();
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const ms = Date.now() - start;
      const ok = res.status === 200;
      console.log(`${ok ? '✓' : '✗'} ${res.status} ${route} (${ms}ms)`);
      results.push({ route, status: res.status, ok });
    } catch (err) {
      console.log(`✗ ERR ${route}: ${err.message}`);
      results.push({ route, status: 0, ok: false, error: err.message });
    }
  }
  return results;
}

async function checkDeployments() {
  console.log('\n── Vercel deployments (production) ──');
  const data = await vercel(
    `/v6/deployments?projectId=${PROJECT_ID}&target=production&limit=5`
  );
  const deployments = data.deployments || [];
  if (!deployments.length) {
    console.log('No production deployments found.');
    return [];
  }
  for (const d of deployments) {
    const when = d.createdAt ? new Date(d.createdAt).toISOString() : '?';
    const state = d.readyState || d.state || 'unknown';
    const icon = state === 'READY' ? '✓' : state === 'ERROR' ? '✗' : '…';
    console.log(`${icon} ${state.padEnd(12)} ${when}  ${d.url || d.uid}`);
    if (d.meta?.githubCommitMessage) {
      console.log(`    ${d.meta.githubCommitMessage.slice(0, 80)}`);
    }
    if (state === 'ERROR' && SHOW_LOGS) {
      await printDeploymentEvents(d.uid);
    }
  }
  return deployments;
}

async function printDeploymentEvents(deploymentId) {
  console.log(`\n── Build events: ${deploymentId} ──`);
  try {
    const events = await vercel(`/v2/deployments/${deploymentId}/events?limit=30`);
    const list = Array.isArray(events) ? events : events.events || [];
    for (const e of list.slice(-15)) {
      const text = (e.text || e.payload?.text || JSON.stringify(e)).slice(0, 200);
      console.log(`  ${text}`);
    }
  } catch (err) {
    console.log(`  (could not fetch events: ${err.message})`);
  }
}

async function main() {
  console.log('90books.com — Vercel status');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Team:    ${TEAM_ID}`);

  const routes = await checkLiveRoutes();
  const liveOk = routes.every((r) => r.ok);

  if (!TOKEN) {
    console.log('\n⚠ VERCEL_TOKEN not set — skipping Vercel API checks.');
    console.log('  Add it in Cursor → Cloud Agents → Secrets, then restart the agent.');
    process.exit(liveOk ? 0 : 1);
  }

  try {
    const deployments = await checkDeployments();
    const latest = deployments[0];
    const deployOk = !latest || latest.readyState === 'READY';

    console.log('\n── Summary ──');
    console.log(`Live site:     ${liveOk ? 'UP' : 'DOWN'}`);
    console.log(`Latest deploy: ${latest ? latest.readyState : 'n/a'}`);
    if (!deployOk) {
      console.log('  (note: newest deployment is not READY — normal while one is');
      console.log('   BUILDING, and a failed PREVIEW build never affects the live site)');
    }

    // Only the LIVE SITE decides pass/fail. This used to fail whenever the
    // newest deployment object was not READY, which is true every time a build
    // is in flight and for any failed preview — while 90books.com served 200
    // throughout. A red run emails Olga, and a check that cries wolf trains her
    // to ignore the one alarm that actually matters.
    if (!liveOk) process.exit(1);
  } catch (err) {
    console.error(`\nVercel API error: ${err.message}`);
    process.exit(liveOk ? 0 : 1);
  }
}

main();

// SEO pre-flight audit — verifies the live site against Google's basic
// crawling/indexing requirements before submitting to Search Console.
//
// For each URL in sitemap.xml, checks:
//   1. HTTP 200 status (not 404, 5xx, or redirect chain)
//   2. <title> tag present + non-empty
//   3. <meta name="description"> present + non-empty
//   4. <link rel="canonical"> present + matches the URL we requested
//   5. <meta property="og:title"> + og:description + og:url
//   6. <meta name="viewport"> (mobile-friendly signal)
//   7. <h1> present (semantic structure)
//   8. NO <meta name="robots" content="noindex"> (would block indexing)
//   9. JSON-LD schema on /books-like/, /genre/, /mood/ pages
//
// Run from project root:  node scripts/seo-audit.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP = join(__dirname, '..', 'sitemap.xml');

function extractUrls() {
  const xml = readFileSync(SITEMAP, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

function check(html, regex) { return regex.test(html); }
function pull(html, regex) { const m = html.match(regex); return m ? m[1].trim() : null; }

const REQUIRED = [
  { id: 'title',       label: '<title>',           test: h => pull(h, /<title>([^<]+)<\/title>/i) },
  { id: 'description', label: 'meta description',  test: h => pull(h, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) },
  { id: 'canonical',   label: 'canonical',         test: h => pull(h, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i) },
  { id: 'og_title',    label: 'og:title',          test: h => pull(h, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) },
  { id: 'og_desc',     label: 'og:description',    test: h => pull(h, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) },
  { id: 'og_url',      label: 'og:url',            test: h => pull(h, /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i) },
  { id: 'viewport',    label: 'viewport meta',     test: h => check(h, /<meta\s+name=["']viewport["']/i) },
  { id: 'h1',          label: '<h1>',              test: h => check(h, /<h1[\s>]/i) },
  { id: 'no_noindex',  label: 'no noindex',        test: h => !/<meta\s+name=["']robots["'][^>]*noindex/i.test(h) },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function auditUrl(url) {
  const result = { url, status: null, checks: {}, canonicalMatch: false, hasJsonLd: false };
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 90books-seo-audit/1.0)' },
    });
    result.status = res.status;
    if (res.status !== 200) return result;
    const html = await res.text();

    for (const r of REQUIRED) {
      result.checks[r.id] = r.test(html);
    }

    const canon = pull(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    result.canonicalMatch = canon && (canon === url || canon === url + '/' || canon + '/' === url);
    result.hasJsonLd = /<script\s+type=["']application\/ld\+json["']/i.test(html);
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

async function main() {
  const urls = extractUrls();
  console.log(`Auditing ${urls.length} URLs from sitemap.xml...\n`);

  const results = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stdout.write(`  [${i + 1}/${urls.length}] ${url} ... `);
    const r = await auditUrl(url);
    results.push(r);
    if (r.status !== 200) {
      console.log(`✗ HTTP ${r.status || 'ERR'}`);
    } else {
      const failed = REQUIRED.filter(req => !r.checks[req.id]).map(req => req.label);
      const canonNote = r.canonicalMatch ? '' : ' [canonical mismatch]';
      const jsonLdNote = (url.match(/\/(books-like|genre|mood)\//) && !r.hasJsonLd) ? ' [missing JSON-LD]' : '';
      if (failed.length || !r.canonicalMatch || jsonLdNote) {
        console.log(`⚠  ${failed.join(', ') || 'ok'}${canonNote}${jsonLdNote}`);
      } else {
        console.log(`✓`);
      }
    }
    await sleep(150);
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const ok = results.filter(r => r.status === 200);
  const errors = results.filter(r => r.status !== 200);
  console.log(`Reachable (200):  ${ok.length}/${urls.length}`);
  if (errors.length) {
    console.log(`\nFailing URLs:`);
    errors.forEach(r => console.log(`  ${r.status || 'ERR'}  ${r.url}  ${r.error || ''}`));
  }

  console.log(`\nPer-check pass rate (of ${ok.length} reachable):`);
  for (const r of REQUIRED) {
    const passed = ok.filter(res => res.checks[r.id]).length;
    const pct = ok.length ? Math.round((passed / ok.length) * 100) : 0;
    const bar = '█'.repeat(Math.floor(pct / 5)).padEnd(20, '░');
    console.log(`  ${r.label.padEnd(20)}  ${bar}  ${passed}/${ok.length}  ${pct}%`);
  }

  const canonOk = ok.filter(r => r.canonicalMatch).length;
  const canonPct = ok.length ? Math.round((canonOk / ok.length) * 100) : 0;
  console.log(`  ${'canonical matches URL'.padEnd(20)}  ${'█'.repeat(Math.floor(canonPct / 5)).padEnd(20, '░')}  ${canonOk}/${ok.length}  ${canonPct}%`);

  const seoPages = ok.filter(r => r.url.match(/\/(books-like|genre|mood)\//));
  const jsonLdOk = seoPages.filter(r => r.hasJsonLd).length;
  const jsonLdPct = seoPages.length ? Math.round((jsonLdOk / seoPages.length) * 100) : 0;
  console.log(`  ${'JSON-LD on SEO pgs'.padEnd(20)}  ${'█'.repeat(Math.floor(jsonLdPct / 5)).padEnd(20, '░')}  ${jsonLdOk}/${seoPages.length}  ${jsonLdPct}%`);

  // Verdict
  const blockers = [];
  if (errors.length) blockers.push(`${errors.length} URLs return non-200 status`);
  for (const r of REQUIRED) {
    const failed = ok.length - ok.filter(res => res.checks[r.id]).length;
    if (failed > 0) blockers.push(`${failed} pages missing ${r.label}`);
  }
  if (ok.length - canonOk > 0) blockers.push(`${ok.length - canonOk} pages have canonical mismatch`);
  if (seoPages.length - jsonLdOk > 0) blockers.push(`${seoPages.length - jsonLdOk} SEO pages missing JSON-LD`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (blockers.length === 0) {
    console.log('VERDICT: ✓ READY TO SUBMIT to Google Search Console.');
  } else {
    console.log('VERDICT: ⚠  Issues found — review before submitting:');
    blockers.forEach(b => console.log(`  • ${b}`));
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });

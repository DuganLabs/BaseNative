#!/usr/bin/env node
/**
 * Lighthouse audit, post-deploy and report-only.
 *
 * Runs the local `lighthouse` package against the deployed docs home and
 * marketing home, in Playwright's Chromium driven over a fixed CDP port.
 * It uses no PageSpeed API, no LHCI server and no secrets. By default it
 * collects only the "Agentic browsing" category (Lighthouse 13.3+, Chrome
 * 150+); set LIGHTHOUSE_CATEGORIES to add others. It never fails on a
 * score, only when a page can't be audited at all.
 *
 * Usage:
 *   pnpm audit:lighthouse
 *   LIGHTHOUSE_URLS=https://basenative.com/,https://basenative.com/docs/ pnpm audit:lighthouse
 *
 * Env vars:
 *   LIGHTHOUSE_URLS        Comma-separated URLs. Default: the marketing home
 *                          and the docs home on basenative.com.
 *   LIGHTHOUSE_CATEGORIES  Comma-separated category ids. Default:
 *                          agentic-browsing.
 *   LIGHTHOUSE_CDP_PORT    Remote-debugging port. Default: 9423.
 *
 * Writes reports/lighthouse-<label>.html and .json (the full Lighthouse
 * reports), plus reports/lighthouse-summary.json. For Agentic browsing, the
 * summary counts audits that passed (score >= 0.9) out of those that
 * applied; not-applicable ones, such as the WebMCP audits on a page with no
 * WebMCP tools, are listed but not counted.
 */
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, '..', '..', 'reports');

const URLS = (process.env.LIGHTHOUSE_URLS ?? 'https://basenative.com/,https://basenative.com/docs/')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
const CATEGORIES = (process.env.LIGHTHOUSE_CATEGORIES ?? 'agentic-browsing')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);
const CDP_PORT = Number(process.env.LIGHTHOUSE_CDP_PORT ?? 9423);
const NOT_COUNTED = ['notApplicable', 'informative', 'manual', 'error'];

function labelFor(url) {
  const { hostname, pathname } = new URL(url);
  const path = pathname.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-');
  return `${hostname}${path ? `-${path}` : '-home'}`;
}

function summarise(lhr) {
  const categories = {};
  for (const id of CATEGORIES) {
    const category = lhr.categories[id];
    if (!category) {
      categories[id] = null;
      continue;
    }
    const audits = category.auditRefs.map((ref) => ({
      id: ref.id,
      title: lhr.audits[ref.id]?.title ?? null,
      scoreDisplayMode: lhr.audits[ref.id]?.scoreDisplayMode ?? null,
      score: lhr.audits[ref.id]?.score ?? null,
    }));
    const counted = audits.filter((a) => !NOT_COUNTED.includes(a.scoreDisplayMode));
    categories[id] = {
      score: category.score,
      passed: counted.filter((a) => a.score !== null && a.score >= 0.9).length,
      applicable: counted.length,
      audits,
    };
  }
  return categories;
}

async function audit(url) {
  // Playwright exposes no wsEndpoint for Lighthouse, so launch Chromium on a
  // fixed CDP port and hand Lighthouse that port. Runs are sequential.
  const browser = await chromium.launch({
    headless: true,
    args: [`--remote-debugging-port=${CDP_PORT}`],
  });
  try {
    const result = await lighthouse(url, {
      port: CDP_PORT,
      output: ['json', 'html'],
      onlyCategories: CATEGORIES,
    });
    if (!result?.lhr) throw new Error('Lighthouse returned no result');
    if (result.lhr.runtimeError) {
      throw new Error(`${result.lhr.runtimeError.code}: ${result.lhr.runtimeError.message}`);
    }
    return result;
  } finally {
    await browser.close();
  }
}

async function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });
  console.log(`\nLighthouse (report-only): ${CATEGORIES.join(', ')}\n`);

  const summary = { timestamp: new Date().toISOString(), categories: CATEGORIES, pages: [] };
  for (const url of URLS) {
    const label = labelFor(url);
    const { lhr, report } = await audit(url);
    writeFileSync(join(REPORTS_DIR, `lighthouse-${label}.json`), report[0]);
    writeFileSync(join(REPORTS_DIR, `lighthouse-${label}.html`), report[1]);
    const categories = summarise(lhr);
    summary.pages.push({
      url,
      label,
      lighthouseVersion: lhr.lighthouseVersion,
      userAgent: lhr.environment?.hostUserAgent ?? null,
      categories,
    });
    console.log(`  ${url}`);
    for (const [id, c] of Object.entries(categories)) {
      console.log(
        c ? `    ${id}: ${c.passed}/${c.applicable} passed` : `    ${id}: not in this Lighthouse`,
      );
    }
  }

  const summaryPath = join(REPORTS_DIR, 'lighthouse-summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n  Summary written to ${summaryPath}`);
}

main().catch((err) => {
  console.error('Lighthouse audit error:', err);
  process.exitCode = 1;
});

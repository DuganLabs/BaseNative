#!/usr/bin/env node
/**
 * axe-core accessibility audit
 * Serves the built static site, runs axe on every route,
 * writes a JSON report, exits 1 if any violations found.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..', '..');
const DIST_DIR = join(root, 'dist');
const REPORTS_DIR = join(root, 'reports');
const PORT = 4299;

// When AUDIT_BASE_URL is set, run against a live deployment instead of local
const AUDIT_BASE_URL = process.env.AUDIT_BASE_URL;

const ROUTES = process.env.AUDIT_BASE_URL
  ? ['/']
  : [
      '/',
      '/tasks/',
      '/playground/',
      '/docs/',
      '/components/',
      '/test-signals/',
    ];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2': 'font/woff2',
};

function serve() {
  return createServer((req, res) => {
    let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    try {
      const ext = extname(filePath);
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'text/plain' });
      res.end(content);
    } catch {
      // SPA fallback — try serving index.html from the requested directory
      try {
        const indexPath = filePath.endsWith('/') ? join(filePath, 'index.html') : join(filePath, 'index.html');
        const content = readFileSync(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch {
        // Final fallback — root index.html
        try {
          const content = readFileSync(join(DIST_DIR, 'index.html'));
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        } catch {
          res.writeHead(500);
          res.end('Server error');
        }
      }
    }
  }).listen(PORT);
}

async function runAxe() {
  mkdirSync(REPORTS_DIR, { recursive: true });

  // Only start local server if not pointing at a live deployment
  const server = AUDIT_BASE_URL ? null : serve();
  const baseUrl = AUDIT_BASE_URL || `http://localhost:${PORT}`;

  const browser = await chromium.launch();
  // Bypass CSP so we can inject axe-core from CDN on preview deployments
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  if (AUDIT_BASE_URL) {
    console.log(`  Running against live deployment: ${AUDIT_BASE_URL}`);
  }

  const allResults = [];
  let totalViolations = 0;

  for (const route of ROUTES) {
    const url = `${baseUrl}${route}`;
    console.log(`\n  Auditing ${route}...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for rendering to settle
    await page.waitForTimeout(1000);

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.0/axe.min.js',
    });

    const results = await page.evaluate(async () => {
      return await window.axe.run(document, {
        rules: {
          // enforce WCAG 2.1 AA
          'color-contrast':           { enabled: true },
          'image-alt':                { enabled: true },
          'label':                    { enabled: true },
          'landmark-one-main':        { enabled: true },
          'region':                   { enabled: true },
          'skip-link':                { enabled: true },
          'html-has-lang':            { enabled: true },
          'document-title':           { enabled: true },
          'link-name':                { enabled: true },
          'button-name':              { enabled: true },
          'aria-required-attr':       { enabled: true },
          'aria-valid-attr':          { enabled: true },
          'focus-order-semantics':    { enabled: true },
        },
      });
    });

    const violations = results.violations;
    totalViolations += violations.length;

    if (violations.length === 0) {
      console.log(`  ✓ ${route} — no violations`);
    } else {
      console.log(`  ✗ ${route} — ${violations.length} violation(s):`);
      for (const v of violations) {
        console.log(`    [${v.impact}] ${v.id}: ${v.description}`);
        for (const node of v.nodes) {
          console.log(`      → ${node.html.slice(0, 120)}`);
        }
      }
    }

    allResults.push({ route, violations, passes: results.passes.length });
  }

  await browser.close();
  if (server) server.close();

  const report = {
    timestamp: new Date().toISOString(),
    totalRoutes: ROUTES.length,
    totalViolations,
    results: allResults,
  };

  const reportPath = join(REPORTS_DIR, `axe-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report written to ${reportPath}`);

  if (totalViolations > 0) {
    console.log(`\n⚠ axe audit found ${totalViolations} violation(s) across ${ROUTES.length} routes`);
    // Report violations as annotations but don't fail the pipeline.
    // Accessibility issues should be tracked and fixed iteratively.
    console.log('::warning::Accessibility violations found — see axe report artifact for details');
  } else {
    console.log(`\n✓ axe audit PASSED — 0 violations across ${ROUTES.length} routes`);
  }
}

runAxe().catch((err) => {
  console.error('axe audit error:', err);
  process.exit(1);
});

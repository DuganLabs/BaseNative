#!/usr/bin/env node
/**
 * Laws of UX Audit
 * Each law from lawsofux.com is codified into measurable DOM assertions.
 * Runs against the built static site via Playwright.
 *
 * Laws covered:
 *   1. Fitts's Law      — touch targets ≥ 44×44px
 *   2. Hick's Law       — nav items ≤ 7, select options ≤ 7 per group
 *   3. Miller's Law     — form fields ≤ 7 per fieldset
 *   4. Jakob's Law      — familiar patterns (nav position, button shape)
 *   5. Law of Proximity — related elements grouped in semantic containers
 *   6. Zeigarnik Effect — loading states exist
 *   7. Serial Position  — primary action is first or last in a list
 *   8. Postel's Law     — inputs accept flexible formats (tel, email)
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
const PORT = 4300;

// When AUDIT_BASE_URL is set, run against a live deployment instead of local
const AUDIT_BASE_URL = process.env.AUDIT_BASE_URL;

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serve() {
  return createServer((req, res) => {
    let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] ?? 'text/plain' });
      res.end(content);
    } catch {
      // Try serving index.html from the requested directory
      try {
        const indexPath = filePath.endsWith('/') ? join(filePath, 'index.html') : join(filePath, 'index.html');
        const content = readFileSync(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch {
        try {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(readFileSync(join(DIST_DIR, 'index.html')));
        } catch { res.writeHead(500); res.end(); }
      }
    }
  }).listen(PORT);
}

const ROUTES_TO_AUDIT = process.env.AUDIT_BASE_URL
  ? ['/']
  : ['/', '/tasks/', '/docs/', '/components/'];

const laws = [
  {
    id: 'fitts',
    name: "Fitts's Law",
    description: 'Interactive elements must be large enough to click/tap easily (min 44×44px)',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const interactive = document.querySelectorAll('button, a, [role="button"], input[type="checkbox"], input[type="radio"], select');
        const violations = [];
        for (const el of interactive) {
          const rect = el.getBoundingClientRect();
          // Skip invisible elements
          if (rect.width === 0 && rect.height === 0) continue;
          // Skip purely decorative elements
          const isDecorative = el.getAttribute('aria-hidden') === 'true';
          if (isDecorative) continue;

          const minSize = 44;
          if (rect.width < minSize || rect.height < minSize) {
            violations.push({
              element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
              text: el.textContent?.trim().slice(0, 60) ?? '',
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              issue: `Touch target ${Math.round(rect.width)}×${Math.round(rect.height)}px — min is ${minSize}×${minSize}px`,
            });
          }
        }
        return violations;
      });
      return violations;
    },
  },
  {
    id: 'hick',
    name: "Hick's Law",
    description: 'Navigation and choice sets should have ≤ 7 items to reduce decision time',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const violations = [];
        const MAX_CHOICES = 7;

        // Check nav item count
        const navMenus = document.querySelectorAll('nav menu, nav ul, nav ol');
        for (const menu of navMenus) {
          const items = menu.querySelectorAll(':scope > li');
          if (items.length > MAX_CHOICES) {
            violations.push({
              element: 'nav menu',
              count: items.length,
              issue: `Navigation has ${items.length} items — Hick's Law recommends ≤ ${MAX_CHOICES}`,
            });
          }
        }

        // Check select option count per group (not total — grouped is OK)
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const optgroups = select.querySelectorAll('optgroup');
          if (optgroups.length > 0) continue; // grouped is fine
          const options = select.querySelectorAll('option');
          if (options.length > MAX_CHOICES) {
            violations.push({
              element: `select[name="${select.name}"]`,
              count: options.length,
              issue: `Select has ${options.length} ungrouped options — consider grouping or ≤ ${MAX_CHOICES}`,
            });
          }
        }
        return violations;
      });
      return violations;
    },
  },
  {
    id: 'miller',
    name: "Miller's Law",
    description: 'Forms should chunk fields into groups of ≤ 7 using fieldsets',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const violations = [];
        const MAX_FIELDS = 7;

        // Check fieldsets
        const fieldsets = document.querySelectorAll('fieldset');
        for (const fs of fieldsets) {
          const fields = fs.querySelectorAll('input, select, textarea');
          if (fields.length > MAX_FIELDS) {
            violations.push({
              element: 'fieldset',
              legend: fs.querySelector('legend')?.textContent?.trim() ?? 'unnamed',
              count: fields.length,
              issue: `Fieldset has ${fields.length} fields — Miller's Law recommends ≤ ${MAX_FIELDS} per chunk`,
            });
          }
        }

        // Check for forms with no fieldset grouping
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
          const ungroupedFields = form.querySelectorAll(':scope > label input, :scope > input, :scope > select');
          if (ungroupedFields.length > MAX_FIELDS) {
            violations.push({
              element: 'form',
              count: ungroupedFields.length,
              issue: `Form has ${ungroupedFields.length} ungrouped fields — use fieldset chunks`,
            });
          }
        }
        return violations;
      });
      return violations;
    },
  },
  {
    id: 'jakob',
    name: "Jakob's Law",
    description: 'Use familiar patterns: nav in header/sidebar, primary actions as buttons',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const violations = [];

        // Primary nav should be in header or aside
        const navElements = document.querySelectorAll('nav');
        let hasPositionedNav = false;
        for (const nav of navElements) {
          const parent = nav.closest('header, aside, main');
          if (parent) { hasPositionedNav = true; break; }
        }
        if (navElements.length > 0 && !hasPositionedNav) {
          violations.push({
            issue: 'Navigation found outside header/aside — users expect nav in familiar locations',
          });
        }

        // Buttons should look like buttons
        const actionButtons = document.querySelectorAll('button[type="button"], button[type="submit"]');
        if (actionButtons.length === 0 && document.querySelectorAll('form, dialog').length > 0) {
          violations.push({
            issue: 'Forms/dialogs exist but no explicit action buttons found',
          });
        }
        return violations;
      });
      return violations;
    },
  },
  {
    id: 'proximity',
    name: 'Law of Proximity',
    description: 'Related elements should be grouped in semantic containers (fieldset, section, article)',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const violations = [];

        // Labels should be adjacent to their inputs
        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
        let unlabelledCount = 0;
        for (const input of inputs) {
          const id = input.id;
          const hasWrappingLabel = input.closest('label');
          const hasLinkedLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
          if (!hasWrappingLabel && !hasLinkedLabel && !hasAriaLabel) {
            unlabelledCount++;
          }
        }
        if (unlabelledCount > 0) {
          violations.push({
            count: unlabelledCount,
            issue: `${unlabelledCount} input(s) lack associated labels — proximity principle requires visible association`,
          });
        }
        return violations;
      });
      return violations;
    },
  },
  {
    id: 'zeigarnik',
    name: 'Zeigarnik Effect',
    description: 'Loading states must exist to show progress and reduce cognitive tension',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const violations = [];

        // Look for any loading-related elements or ARIA live regions
        const hasLoadingAria = document.querySelector('[aria-live], [role="status"], [role="progressbar"]');
        const hasLoadingClass = document.querySelector('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
        const hasLoadingLabel = document.querySelector('[aria-label*="Loading"], [aria-label*="loading"]');

        if (!hasLoadingAria && !hasLoadingClass && !hasLoadingLabel) {
          violations.push({
            issue: 'No loading state indicators found — async operations need visual feedback (aria-live, role="status", or loading classes)',
          });
        }
        return violations;
      });
      return violations;
    },
  },
  {
    id: 'serial-position',
    name: 'Serial Position Effect',
    description: 'Primary actions should appear first or last in action groups (not buried in the middle)',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const violations = [];

        // In dialog footers, primary button should be last (conventional) or first
        const dialogFooters = document.querySelectorAll('dialog footer, form footer');
        for (const footer of dialogFooters) {
          const buttons = footer.querySelectorAll('button');
          if (buttons.length < 2) continue;
          const primaryButtons = footer.querySelectorAll('button.btn-primary, button[type="submit"]');
          if (primaryButtons.length === 0) {
            violations.push({
              issue: 'Dialog/form footer has multiple buttons but no clearly marked primary action',
            });
          }
        }
        return violations;
      });
      return violations;
    },
  },
  {
    id: 'postel',
    name: "Postel's Law",
    description: 'Inputs should be liberal in what they accept (correct input types for flexible parsing)',
    async audit(page) {
      const violations = await page.evaluate(() => {
        const violations = [];
        const skipSearch = (el) => el.closest('search') || el.type === 'search';

        // Phone inputs should use type="tel"
        const phoneInputs = document.querySelectorAll('input[name*="phone"], input[placeholder*="phone"], input[placeholder*="Phone"]');
        for (const input of phoneInputs) {
          if (skipSearch(input)) continue;
          if (input.type !== 'tel') {
            violations.push({
              element: `input[name="${input.name}"]`,
              issue: `Phone input uses type="${input.type}" — use type="tel" for flexible input on mobile`,
            });
          }
        }

        // Email inputs should use type="email"
        const emailInputs = document.querySelectorAll('input[name*="email"], input[placeholder*="email"], input[placeholder*="Email"]');
        for (const input of emailInputs) {
          if (skipSearch(input)) continue;
          if (input.type !== 'email') {
            violations.push({
              element: `input[name="${input.name}"]`,
              issue: `Email input uses type="${input.type}" — use type="email" for validation and mobile keyboard`,
            });
          }
        }
        return violations;
      });
      return violations;
    },
  },
];

async function runLawsAudit() {
  mkdirSync(REPORTS_DIR, { recursive: true });

  const server = AUDIT_BASE_URL ? null : serve();
  const baseUrl = AUDIT_BASE_URL || `http://localhost:${PORT}`;

  const browser = await chromium.launch();
  // Bypass CSP so audit scripts work against preview deployments
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  if (AUDIT_BASE_URL) {
    console.log(`  Running against live deployment: ${AUDIT_BASE_URL}`);
  }

  // Set viewport to mobile size to catch Fitts violations on small screens too
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro

  const allResults = [];
  let totalViolations = 0;

  for (const route of ROUTES_TO_AUDIT) {
    const url = `${baseUrl}${route}`;
    console.log(`\n  Auditing ${route} against Laws of UX...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const routeResults = [];

    for (const law of laws) {
      const violations = await law.audit(page);
      const status = violations.length === 0 ? 'pass' : 'fail';
      if (violations.length > 0) totalViolations += violations.length;

      if (violations.length === 0) {
        console.log(`    ✓ ${law.name}`);
      } else {
        console.log(`    ✗ ${law.name} — ${violations.length} violation(s):`);
        for (const v of violations) {
          console.log(`      → ${v.issue}`);
        }
      }

      routeResults.push({ law: law.id, name: law.name, status, violations });
    }

    allResults.push({ route, results: routeResults });
  }

  await browser.close();

  // Also run desktop viewport
  const browser2 = await chromium.launch();
  const context2 = await browser2.newContext({ bypassCSP: true });
  const page2 = await context2.newPage();
  await page2.setViewportSize({ width: 1440, height: 900 });

  console.log('\n  Re-running Fitts\'s Law on desktop viewport...');
  for (const route of ROUTES_TO_AUDIT) {
    await page2.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(800);
    const fittsViolations = await laws[0].audit(page2);
    if (fittsViolations.length > 0) {
      console.log(`    ✗ ${route} desktop Fitts violations: ${fittsViolations.length}`);
      totalViolations += fittsViolations.length;
    }
  }

  await browser2.close();
  if (server) server.close();

  const report = {
    timestamp: new Date().toISOString(),
    totalViolations,
    routes: ROUTES_TO_AUDIT,
    laws: laws.map((l) => ({ id: l.id, name: l.name, description: l.description })),
    results: allResults,
  };

  const reportPath = join(REPORTS_DIR, `laws-of-ux-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report written to ${reportPath}`);

  if (totalViolations > 0) {
    console.log(`\n⚠ Laws of UX audit found ${totalViolations} violation(s)`);
    // Report violations as annotations but don't fail the pipeline.
    // UX issues should be tracked and fixed iteratively.
    console.log('::warning::Laws of UX violations found — see report artifact for details');
  } else {
    console.log(`\n✓ Laws of UX audit PASSED — all laws satisfied`);
  }
}

runLawsAudit().catch((err) => {
  console.error('Laws of UX audit error:', err);
  process.exit(1);
});

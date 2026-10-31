import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../../packages/server/src/render.js';
import {
  loadRegistry,
  renderComponent as renderCatalog,
  assembleStyles,
} from '../../packages/components/src/loader.js';

/*
 * Adaptive-component layout contracts, asserted on real geometry.
 *
 * The unit suite asserts markup and stylesheet text; these specs assert
 * what a phone actually renders, because the defects they guard against
 * — a table whose values sit behind an unaffordanced sideways scroll or
 * clip outright, a nav bar whose More control is a content-sized stub
 * shoved against one edge — are invisible to string assertions. The
 * fixtures deliberately carry the hostile content: long prose and a
 * long unbroken token, the cell content that broke the table in the
 * wild.
 *
 * The fixtures render the catalog components through the registry and
 * load the loader's own style assembly (tokens + the components'
 * sheets, the same CSS the site serves as trinity.css), so the fixture
 * cannot drift from the shipped styles the way a hand-kept file list
 * once did. The table restack keys off the table's CONTAINER, so the
 * fixture wraps tables in a section that establishes one, the way a
 * host's layout does.
 */

const SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'packages',
  'components',
  'src',
);

const registry = await loadRegistry();
const CSS = [
  readFileSync(join(SRC, 'layers.css'), 'utf8'),
  readFileSync(join(SRC, 'reset.css'), 'utf8'),
  await assembleStyles(registry, ['table', 'app-bar', 'sidebar', 'app-shell']),
  'body > section { container-type: inline-size; }',
].join('\n');

async function renderComponent(page, html) {
  await page.setContent(
    `<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`,
  );
}

const LONG_TOKEN =
  'unbroken-token-that-refuses-to-wrap-and-would-force-any-container-wide-open-0123456789abcdef';

function proseTable() {
  return renderCatalog(registry, render, 'table', {
    caption: 'Posture',
    columns: ['Measure', 'BaseNative', 'React 19', 'Angular 20', 'Reference'],
    rows: [
      [
        'A stored template (CMS, database, model output) renders as-is',
        'Yes — interpreted against a scope, prototype access blocklisted',
        'No — it must go through the build first',
        'No — it must go through the build first',
        LONG_TOKEN,
      ],
      [
        'eval / Function constructor in shipped code',
        '0',
        '0 — after its compiler runs',
        '0 — after AOT compilation',
        'docs/api/components.md#responsive-stacking',
      ],
    ],
  }).html;
}

test.describe('Table — narrow-width contract', () => {
  for (const width of [390, 320]) {
    test(`stacks with nothing clipped at ${width}px, long unbroken content included`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await renderComponent(page, `<section>${proseTable()}</section>`);

      const geometry = await page.evaluate(() => {
        const container = document.querySelector('body > section');
        const thead = document.querySelector('table[variant="default"] thead');
        const cells = [...document.querySelectorAll('table[variant="default"] tbody td')];
        const firstRowCells = [
          ...document.querySelectorAll('table[variant="default"] tbody tr:first-child td'),
        ];
        return {
          containerClient: container.clientWidth,
          containerScroll: container.scrollWidth,
          theadHeight: thead.getBoundingClientRect().height,
          // scrollWidth alone misses this defect class: a value can paint
          // past its cell's edge without registering as scroll overflow.
          // Measure the rendered text itself against the cell box.
          cells: cells.map((td) => {
            const box = td.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(td);
            const text = range.getBoundingClientRect();
            return { left: text.left - box.left, right: text.right - box.right };
          }),
          stackedLines: new Set(firstRowCells.map((td) => Math.round(td.getBoundingClientRect().y)))
            .size,
        };
      });

      expect(geometry.containerScroll).toBeLessThanOrEqual(geometry.containerClient + 1);
      for (const cell of geometry.cells) {
        expect(cell.left).toBeGreaterThanOrEqual(-1);
        expect(cell.right).toBeLessThanOrEqual(1);
      }
      expect(geometry.theadHeight).toBeLessThanOrEqual(1);
      expect(geometry.stackedLines).toBeGreaterThan(1);
    });
  }

  test('stays a table where the container fits it (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await renderComponent(page, `<section>${proseTable()}</section>`);

    const geometry = await page.evaluate(() => {
      const thead = document.querySelector('table[variant="default"] thead');
      const firstRowCells = [
        ...document.querySelectorAll('table[variant="default"] tbody tr:first-child td'),
      ];
      return {
        theadHeight: thead.getBoundingClientRect().height,
        rowLines: new Set(firstRowCells.map((td) => Math.round(td.getBoundingClientRect().y))).size,
      };
    });

    expect(geometry.theadHeight).toBeGreaterThan(10);
    expect(geometry.rowLines).toBe(1);
  });

  test('a consumer nowrap on row headings cannot pin a stacked cell open', async ({ page }) => {
    // The failure this guards: a wide-table stylesheet that keeps row
    // headings on one line (the site's own compare-table rule did) meets
    // the component contract. Consumer sheets are layered; the catalog's
    // sheets are not, and the stack resets white-space, so the heading
    // wraps like any other cell instead of painting past its box and
    // forcing the container into a sideways scroll.
    await page.setViewportSize({ width: 390, height: 844 });
    const table = renderCatalog(registry, render, 'table', {
      columns: ['Measure', 'BaseNative', 'React 19'],
      rows: [
        [
          {
            text: 'A stored template (CMS, database, model output) renders as-is',
            header: true,
          },
          'Yes — interpreted against a scope, prototype access blocklisted',
          'No — it must go through the build first',
        ],
      ],
    }).html;
    await renderComponent(page, `<section>${table}</section>`);
    await page.addStyleTag({
      content: '@layer components { table[variant="default"] th[scope="row"] { white-space: nowrap; } }',
    });

    const geometry = await page.evaluate(() => {
      const container = document.querySelector('body > section');
      const heading = document.querySelector('table[variant="default"] tbody th');
      const cells = [
        ...document.querySelectorAll(
          'table[variant="default"] tbody th, table[variant="default"] tbody td',
        ),
      ].map((c) => {
        const box = c.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(c);
        return range.getBoundingClientRect().right - box.right;
      });
      // The heading's own text, line by line: the wrap is the contract,
      // measured directly instead of through a height calibrated to the
      // type metrics of an earlier stylesheet.
      const range = document.createRange();
      range.selectNodeContents(heading);
      const headingLines = new Set(
        [...range.getClientRects()].map((rect) => Math.round(rect.top)),
      ).size;
      return {
        containerClient: container.clientWidth,
        containerScroll: container.scrollWidth,
        headingLines,
        overhangs: cells,
      };
    });

    expect(geometry.containerScroll).toBeLessThanOrEqual(geometry.containerClient + 1);
    for (const overhang of geometry.overhangs) expect(overhang).toBeLessThanOrEqual(1);
    // The long heading wrapped onto a second line rather than overflowing.
    expect(geometry.headingLines).toBeGreaterThanOrEqual(2);
  });
});

const ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>';
const NAV_ITEMS = [
  { label: 'Home', href: '/', iconHtml: ICON, current: true },
  { label: 'Compare', href: '/compare', iconHtml: ICON },
  { label: 'Components', href: '/components', iconHtml: ICON },
  { label: 'Docs', href: '/docs', iconHtml: ICON },
  { label: 'Playground', href: '/playground', iconHtml: ICON },
  { label: 'Builder', href: '/builder', iconHtml: ICON },
];

function appBarHtml() {
  return renderCatalog(registry, render, 'app-bar', { items: NAV_ITEMS }).html;
}

test.describe('App nav — bar geometry', () => {
  test('equal cells and symmetric edge insets at 390px, More included', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await renderComponent(page, appBarHtml());

    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('nav[variant="app-bar"]');
      const navBox = nav.getBoundingClientRect();
      const cells = [...nav.querySelectorAll(':scope > ul > li')]
        .filter((li) => li.getClientRects().length)
        .map((li) => {
          const box = li.getBoundingClientRect();
          const icon = li.querySelector('svg');
          const iconBox = icon ? icon.getBoundingClientRect() : null;
          return {
            width: box.width,
            iconLeft: iconBox ? iconBox.x - navBox.x : null,
            iconRight: iconBox ? navBox.x + navBox.width - (iconBox.x + iconBox.width) : null,
          };
        });
      return { cells };
    });

    expect(geometry.cells.length).toBe(5);
    const widths = geometry.cells.map((c) => c.width);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    const first = geometry.cells[0];
    const last = geometry.cells[geometry.cells.length - 1];
    expect(Math.abs(first.iconLeft - last.iconRight)).toBeLessThanOrEqual(1);

    // Equal cells must not be bought with ellipsized labels: the whole
    // standard label set fits its cell at this width.
    const ellipsized = await page.evaluate(() =>
      [...document.querySelectorAll('nav[variant="app-bar"] > ul > li > a')]
        .filter((el) => el.getClientRects().length)
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent),
    );
    expect(ellipsized).toEqual([]);
  });

  test('at 320px the min-content floor keeps every label inside its own cell', async ({ page }) => {
    // The other half of the bar's contract: where an equal share would
    // be narrower than the widest label, cells are NOT equal — the
    // long label keeps its cell and the short ones compress — so the
    // text of every cell (icon + label, measured as one range) stays
    // inside its cell and no two cells' text can overlap.
    await page.setViewportSize({ width: 320, height: 844 });
    await renderComponent(page, appBarHtml());

    const labels = await page.evaluate(() =>
      [...document.querySelectorAll('nav[variant="app-bar"] > ul > li')].map((li) => {
        const cell = li.querySelector('a, button');
        const range = document.createRange();
        range.selectNodeContents(cell);
        const text = range.getBoundingClientRect();
        const box = li.getBoundingClientRect();
        return {
          label: cell.textContent.trim(),
          left: text.left,
          right: text.right,
          cellLeft: box.left,
          cellRight: box.right,
          cellWidth: box.width,
        };
      }),
    );

    expect(labels.map((l) => l.label)).toEqual(['Home', 'Compare', 'Components', 'Docs', 'More']);
    for (const label of labels) {
      expect(label.left).toBeGreaterThanOrEqual(label.cellLeft - 1);
      expect(label.right).toBeLessThanOrEqual(label.cellRight + 1);
    }
    const components = labels.find((l) => l.label === 'Components');
    const home = labels.find((l) => l.label === 'Home');
    expect(components.cellWidth).toBeGreaterThan(home.cellWidth);
  });

  test('at 1280px the shell retires the bar and the rail carries every destination', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const sidebar = renderCatalog(registry, render, 'sidebar', {
      sections: [{ items: NAV_ITEMS }],
    }).html;
    const shell = renderCatalog(registry, render, 'app-shell', {
      sidebarHtml: sidebar,
      appBarHtml: appBarHtml(),
      contentHtml: '<p>Page content</p>',
    }).html;
    await renderComponent(page, shell);

    const geometry = await page.evaluate(() => {
      const bar = document.querySelector('nav[variant="app-bar"]');
      const rail = document.querySelector('aside[variant="sidebar"]');
      const railBox = rail.getBoundingClientRect();
      const visibleItems = [...rail.querySelectorAll('a')].filter(
        (a) => a.getClientRects().length,
      );
      const firstLink = visibleItems[0].getBoundingClientRect();
      const lastLink = visibleItems[visibleItems.length - 1].getBoundingClientRect();
      return {
        barVisible: bar ? bar.getClientRects().length > 0 : false,
        visibleCount: visibleItems.length,
        leftInset: firstLink.x - railBox.x,
        rightInset: railBox.x + railBox.width - (lastLink.x + lastLink.width),
      };
    });

    expect(geometry.barVisible).toBe(false);
    expect(geometry.visibleCount).toBe(6);
    expect(Math.abs(geometry.leftInset - geometry.rightInset)).toBeLessThanOrEqual(1);
  });
});

/*
 * The contract on the real pages. The fixtures above prove the catalog
 * renderer's contract; these prove the consumers that were actually
 * broken. Since the Holy Trinity migration the site's content tables are
 * the catalog table (examples/express composes them with renderTrinity):
 * semantic <table variant="…"> with no container wrapper — at narrow
 * widths the header row steps out of the visual flow, each row's first
 * cell becomes its label line, and every data cell carries its column
 * heading as a visible key line. The gates below assert that contract:
 * stacked, keyed, nothing clipped, no sideways scroll.
 */
test.describe('Site tables — the contract on real pages', () => {
  async function tableGeometry(page) {
    return page.evaluate(() =>
      [...document.querySelectorAll('table[variant]')].map((t) => {
        const rows = [...t.querySelectorAll('tbody tr')].map((tr) => {
          const cells = [...tr.querySelectorAll('th, td')];
          return {
            header: cells.length > 0 && cells[0].tagName === 'TH' && cells[0].scope === 'row',
            label: (cells[0]?.textContent || '').trim().length > 0,
            lines: new Set(cells.map((c) => Math.round(c.getBoundingClientRect().y))).size,
            cells: cells.length,
            keys: cells.map((c) => {
              if (c.tagName !== 'TD') return null;
              const key = c.querySelector(':scope > b');
              return {
                text: key ? key.textContent.trim() : null,
                visible: Boolean(
                  key &&
                    getComputedStyle(key).display !== 'none' &&
                    key.getBoundingClientRect().height > 0,
                ),
              };
            }),
          };
        });
        return {
          heads: [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim()),
          tableClient: t.clientWidth,
          tableScroll: t.scrollWidth,
          theadHeight: t.querySelector('thead')?.getBoundingClientRect().height ?? 0,
          rows,
          overhangs: [...t.querySelectorAll('tbody th, tbody td')].map((c) => {
            const box = c.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(c);
            return range.getBoundingClientRect().right - box.right;
          }),
        };
      }),
    );
  }

  for (const [path, count, rowHeaders] of [
    ['/compare', 6, true],
    // The /ai scorecard is one catalog table whose rows open with a
    // grouping data cell. It joins this gate because it is where the
    // restack's missing wrap defence actually bit: prose carrying an
    // unbreakable identifier (globalThis.__BASENATIVE_DEVTOOLS__)
    // forced the table 75px past a 320px viewport while the compare
    // tables, with no such token, stacked cleanly. (/roadmap's seven
    // tables stood here until the route consolidation retired the
    // page; the contract coverage continues on /compare and /ai.)
    ['/ai', 1, false],
  ]) {
    test(`${path} at 390px: every table stacked, labelled, nothing clipped`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      const tables = await tableGeometry(page);
      expect(tables.length).toBe(count);
      for (const t of tables) {
        expect(t.tableScroll).toBeLessThanOrEqual(t.tableClient + 1);
        expect(t.theadHeight).toBeLessThanOrEqual(1);
        for (const overhang of t.overhangs) expect(overhang).toBeLessThanOrEqual(1);
        for (const row of t.rows) {
          // Stacked: a row's cells sit on distinct lines, and its first
          // cell is the label line — a row header where the table's data
          // has one (compare), the measure cell where it does not
          // (the /ai scorecard rows are all data cells by design).
          expect(row.lines).toBe(row.cells);
          expect(row.label).toBe(true);
          if (rowHeaders) expect(row.header).toBe(true);
          // Keyed: every data cell shows its own column heading — a
          // restacked value with no key is a number without a framework.
          row.keys.forEach((key, ci) => {
            if (key === null) return;
            expect(key.text).toBe(t.heads[ci]);
            expect(key.visible).toBe(true);
          });
        }
      }
    });
  }

  test('/components/table at 390px: no demo table collapses to zero width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/components/table');
    const geometry = await page.evaluate(() =>
      [...document.querySelectorAll('table')].map((t) => ({
        variant: t.getAttribute('variant'),
        width: t.getBoundingClientRect().width,
        theadHeight: t.querySelector('thead')?.getBoundingClientRect().height ?? null,
        rowHeights: [...t.querySelectorAll('tbody tr')].map(
          (r) => r.getBoundingClientRect().height,
        ),
      })),
    );
    expect(geometry.length).toBeGreaterThanOrEqual(2);
    for (const t of geometry) {
      expect(t.width).toBeGreaterThan(100);
      for (const h of t.rowHeights) expect(h).toBeLessThan(200);
      // A catalog table demo restacks at this width like the real thing.
      if (t.variant && t.theadHeight != null) expect(t.theadHeight).toBeLessThanOrEqual(1);
    }
  });
});

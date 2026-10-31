import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTable, renderAppNav } from '../../packages/components/src/index.js';

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
 */

const SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'packages',
  'components',
  'src',
);
// The fixture loads the package's sheets the way its own CSS entry
// (index.css) composes them. The list once drifted from index.css and
// named a token sheet that declared none of the tokens the component
// sheets consume, so every var() in them silently resolved to nothing
// (the app-nav icons rendered at 0x0 in this fixture). Mirror
// index.css exactly; when it changes, change this list with it.
const CSS = [
  'layers.css',
  'reset.css',
  'tokens.css',
  'layout.css',
  'components.css',
  'states.css',
]
  .map((file) => readFileSync(join(SRC, file), 'utf8'))
  .join('\n');

async function renderComponent(page, html) {
  await page.setContent(
    `<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`,
  );
}

const LONG_TOKEN =
  'unbroken-token-that-refuses-to-wrap-and-would-force-any-container-wide-open-0123456789abcdef';

function proseTable(labelCells) {
  return renderTable({
    caption: 'Posture',
    columns: [
      { key: 'measure', label: 'Measure' },
      { key: 'basenative', label: 'BaseNative' },
      { key: 'react', label: 'React 19' },
      { key: 'angular', label: 'Angular 20' },
      { key: 'ref', label: 'Reference' },
    ],
    rows: [
      {
        measure: 'A stored template (CMS, database, model output) renders as-is',
        basenative: 'Yes — interpreted against a scope, prototype access blocklisted',
        react: 'No — it must go through the build first',
        angular: 'No — it must go through the build first',
        ref: LONG_TOKEN,
      },
      {
        measure: 'eval / Function constructor in shipped code',
        basenative: '0',
        react: '0 — after its compiler runs',
        angular: '0 — after AOT compilation',
        ref: 'docs/api/components.md#responsive-stacking',
      },
    ],
    labelCells,
  });
}

test.describe('Table — narrow-width contract', () => {
  for (const width of [390, 320]) {
    test(`stacks with nothing clipped at ${width}px, long unbroken content included`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await renderComponent(page, proseTable(true));

      const geometry = await page.evaluate(() => {
        const container = document.querySelector('[data-bn="table-container"]');
        const thead = document.querySelector('[data-bn="table"] thead');
        const cells = [...document.querySelectorAll('[data-bn="table"] tbody td')];
        const firstRowCells = [
          ...document.querySelectorAll('[data-bn="table"] tbody tr:first-child td'),
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
    await renderComponent(page, proseTable(true));

    const geometry = await page.evaluate(() => {
      const thead = document.querySelector('[data-bn="table"] thead');
      const firstRowCells = [
        ...document.querySelectorAll('[data-bn="table"] tbody tr:first-child td'),
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
    // markup in the component contract. The stack resets white-space, so
    // the heading wraps like any other cell instead of painting past its
    // box and forcing the container into a sideways scroll.
    await page.setViewportSize({ width: 390, height: 844 });
    await renderComponent(
      page,
      `<div data-bn="table-container"><table data-bn="table" data-hostile>
        <thead><tr><th scope="col">Measure</th><th scope="col">BaseNative</th><th scope="col">React 19</th></tr></thead>
        <tbody><tr>
          <th scope="row" data-label="Measure">A stored template (CMS, database, model output) renders as-is</th>
          <td data-label="BaseNative">Yes — interpreted against a scope, prototype access blocklisted</td>
          <td data-label="React 19">No — it must go through the build first</td>
        </tr></tbody>
      </table></div>`,
    );
    await page.addStyleTag({
      content: '@layer components { [data-hostile] th[scope="row"] { white-space: nowrap; } }',
    });

    const geometry = await page.evaluate(() => {
      const container = document.querySelector('[data-bn="table-container"]');
      const heading = document.querySelector('[data-bn="table"] tbody th');
      const cells = [
        ...document.querySelectorAll('[data-bn="table"] tbody th, [data-bn="table"] tbody td'),
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
  { label: 'Home', href: '/', icon: ICON, current: true },
  { label: 'Compare', href: '/compare', icon: ICON },
  { label: 'Components', href: '/components', icon: ICON },
  { label: 'Docs', href: '/docs', icon: ICON },
  { label: 'Playground', href: '/playground', icon: ICON },
  { label: 'Builder', href: '/builder', icon: ICON },
];

test.describe('App nav — bar geometry', () => {
  test('equal cells and symmetric edge insets at 390px, More included', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await renderComponent(page, renderAppNav({ items: NAV_ITEMS, overflow: {}, brand: {} }));

    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('[data-bn="app-nav"]');
      const navBox = nav.getBoundingClientRect();
      const cells = [...nav.querySelectorAll('[data-bn="app-nav-list"] > li')]
        .filter((li) => li.getClientRects().length)
        .map((li) => {
          const box = li.getBoundingClientRect();
          const icon = li.querySelector('[data-bn="app-nav-icon"]');
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
      [...document.querySelectorAll('[data-bn="app-nav-label"]')]
        .filter((el) => el.getClientRects().length)
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent),
    );
    expect(ellipsized).toEqual([]);
  });

  test('rail at 1280px: More cell hidden, overflow items restored, inline insets symmetric', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await renderComponent(page, renderAppNav({ items: NAV_ITEMS, overflow: {}, brand: {} }));

    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('[data-bn="app-nav"]');
      const navBox = nav.getBoundingClientRect();
      const moreCell = nav.querySelector('[data-bn="app-nav-more-cell"]');
      const visibleItems = [...nav.querySelectorAll('[data-bn="app-nav-list"] > li > a')].filter(
        (a) => a.getClientRects().length,
      );
      const firstLink = visibleItems[0].getBoundingClientRect();
      return {
        direction: getComputedStyle(nav).flexDirection,
        moreCellVisible: moreCell ? moreCell.getClientRects().length > 0 : false,
        visibleCount: visibleItems.length,
        leftInset: firstLink.x - navBox.x,
        rightInset: navBox.x + navBox.width - (firstLink.x + firstLink.width),
      };
    });

    expect(geometry.direction).toBe('column');
    expect(geometry.moreCellVisible).toBe(false);
    expect(geometry.visibleCount).toBe(6);
    expect(Math.abs(geometry.leftInset - geometry.rightInset)).toBeLessThanOrEqual(1);
  });
});

/*
 * The contract on the real pages. The fixtures above prove the legacy
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

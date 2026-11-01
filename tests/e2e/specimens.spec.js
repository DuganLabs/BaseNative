import { test, expect } from '@playwright/test';

// Specimen behaviour, proven in a browser: every interactive catalog
// specimen is mounted by public/specimens.js with its component's own
// view model, so these specs exercise the components' APG patterns on
// the pages that demonstrate them — keyboard first, as the patterns
// are written. The mount flag is the boot's own completion marker;
// waiting on it keeps a spec from racing the swap of the server
// render for the hydrated template.

const PREVIEW = '[data-bn-component-preview]';

async function mounted(page, path) {
  await page.goto(path);
  await page.waitForSelector('html[data-bn-specimens-mounted]');
}

test.describe('Specimens — one deploy, one version', () => {
  // A module that imports the bare '/basenative.js', and every template
  // the specimens fetch, must load under the page's version so a cached
  // copy can never outlive a deploy.
  test('the bundle and the component templates load versioned', async ({ page }) => {
    await mounted(page, '/components/combobox');
    await page.locator(`${PREVIEW} section input`).first().click();
    const urls = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((e) => new URL(e.name))
        .filter(
          (u) =>
            u.pathname === '/basenative.js' || /^\/bn-css\/[^/]+\/index\.html$/.test(u.pathname),
        )
        .map((u) => u.pathname + u.search),
    );
    expect(urls.length).toBeGreaterThan(1);
    expect(urls.filter((u) => !/\?v=[0-9a-f]+$/.test(u))).toEqual([]);
  });
});

test.describe('Specimens — combobox', () => {
  test('focus opens, typing filters, arrows move the active option, Enter chooses', async ({
    page,
  }) => {
    await mounted(page, '/components/combobox');
    const root = page.locator(`${PREVIEW} section`);
    const input = root.locator('input');
    await input.focus();
    const listbox = root.locator('ul[role="listbox"]');
    await expect(listbox).toBeVisible();
    await expect(listbox.locator('li')).toHaveCount(3);
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveAttribute('aria-activedescendant', 'demo-combo-option-orange');

    await input.fill('river');
    await expect(listbox.locator('li')).toHaveCount(1);
    await expect(listbox.locator('li')).toHaveText('Riverside');

    await page.keyboard.press('Enter');
    await expect(listbox).toHaveCount(0);
    await expect(input).toHaveValue('Riverside');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test('an outside pointerdown closes the popup; Escape closes it too', async ({ page }) => {
    await mounted(page, '/components/combobox');
    const root = page.locator(`${PREVIEW} section`);
    const input = root.locator('input');
    await input.focus();
    await expect(root.locator('ul[role="listbox"]')).toBeVisible();
    await page.locator('h1').click({ position: { x: 5, y: 5 } });
    await expect(root.locator('ul[role="listbox"]')).toHaveCount(0);

    await input.focus();
    await expect(root.locator('ul[role="listbox"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(root.locator('ul[role="listbox"]')).toHaveCount(0);
  });
});

test.describe('Specimens — multiselect', () => {
  test('Enter toggles the active option into the chips; a chip button removes it', async ({
    page,
  }) => {
    await mounted(page, '/components/multiselect');
    const root = page.locator(`${PREVIEW} section`);
    const input = root.locator('input');
    const chips = root.locator(':scope > ul:not([role]) > li');
    await expect(chips).toHaveCount(1);

    await input.focus();
    await expect(root.locator('ul[role="listbox"]')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', 'demo-trades-option-ev');
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', 'demo-trades-option-panel');
    await page.keyboard.press('Enter');
    await expect(chips).toHaveCount(2);

    await chips.filter({ hasText: 'EV charging' }).locator('button').click();
    await expect(chips).toHaveCount(1);
    await expect(chips).toContainText('Panel upgrade');
    await expect(input).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(root.locator('ul[role="listbox"]')).toHaveCount(0);
  });
});

test.describe('Specimens — select', () => {
  test('click opens and chooses; an arrow opens the closed popover; Escape closes', async ({
    page,
  }) => {
    await mounted(page, '/components/select');
    const root = page.locator(`${PREVIEW} section[variant="select"]`);
    const button = root.locator('button');
    await expect(button).toHaveText(/HVAC/);

    await button.click();
    await expect(root.locator('ul[role="listbox"] li')).toHaveCount(3);
    await root.locator('ul[role="listbox"] li', { hasText: 'Plumbing' }).click();
    await expect(button).toHaveText(/Plumbing/);
    await expect(root.locator('ul[role="listbox"]')).toHaveCount(0);

    await button.focus();
    await page.keyboard.press('ArrowDown');
    await expect(root.locator('ul[role="listbox"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(root.locator('ul[role="listbox"]')).toHaveCount(0);
  });
});

test.describe('Specimens — tabs', () => {
  test('arrows move selection and focus with wrap; Home and End jump', async ({ page }) => {
    await mounted(page, '/components/tabs');
    const tabs = page.locator(`${PREVIEW} [role="tab"]`);
    await expect(tabs).toHaveCount(3);
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    const panels = page.locator(`${PREVIEW} [role="tabpanel"]`);
    await expect(panels.nth(0)).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
  });
});

test.describe('Specimens — dialog family', () => {
  test('Escape dismisses the staged dialog on /components/dialog', async ({ page }) => {
    await mounted(page, '/components/dialog');
    await page.getByRole('button', { name: 'Archive this job' }).click();
    const dialog = page.locator(`${PREVIEW} dialog[variant="default"]`);
    await expect(dialog).toHaveJSProperty('open', true);
    await dialog.locator('header button').focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveJSProperty('open', false);
  });

  test('the drawer dismisses from its Close button', async ({ page }) => {
    await mounted(page, '/components/drawer');
    await page.getByRole('button', { name: 'Open lead detail' }).click();
    const drawer = page.locator(`${PREVIEW} dialog`);
    await expect(drawer).toHaveJSProperty('open', true);
    await drawer.locator('header button').click();
    await expect(drawer).toHaveJSProperty('open', false);
  });

  test('the command palette filters as you type and Enter chooses and closes', async ({ page }) => {
    await mounted(page, '/components/command-palette');
    await page.getByRole('button', { name: 'Open command palette' }).click();
    const palette = page.locator(`${PREVIEW} dialog`);
    await expect(palette).toHaveJSProperty('open', true);
    const search = palette.locator('input[type="search"]');
    await search.fill('import');
    await expect(palette.locator('[role="option"]')).toHaveCount(1);
    await expect(palette.locator('[role="option"]')).toHaveText('Import leads');
    await expect(search).toHaveAttribute('aria-activedescendant', 'demo-palette-option-import');
    await page.keyboard.press('Enter');
    await expect(palette).toHaveJSProperty('open', false);
  });
});

test.describe('Specimens — dropdown menu', () => {
  test('arrows move focus through the items with wrap, Home and End jump', async ({ page }) => {
    await mounted(page, '/components/dropdown-menu');
    const items = page.locator(`${PREVIEW} menu [role="menuitem"]`);
    await expect(items).toHaveCount(3);
    await items.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(items.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.nth(2)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(items.nth(0)).toBeFocused();
  });
});

test.describe('Specimens — tree', () => {
  test('the toggle button collapses and expands; the arrows do the same', async ({ page }) => {
    await mounted(page, '/components/tree');
    const tree = page.locator(`${PREVIEW} ul[role="tree"]`).first();
    const branch = tree.locator(':scope > li[role="treeitem"]').first();
    await expect(branch).toHaveAttribute('aria-expanded', 'true');
    await branch.locator('button').click();
    await expect(branch).toHaveAttribute('aria-expanded', 'false');
    await branch.focus();
    await page.keyboard.press('ArrowRight');
    await expect(branch).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(branch).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Specimens — tree disclosure', () => {
  for (const scheme of ['light', 'dark']) {
    test(`a branch leads with a centred chevron that turns and toggles (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await mounted(page, '/components/tree');
      const tree = page.locator(`${PREVIEW} ul[role="tree"]`).first();
      const branch = tree.locator(':scope > li[role="treeitem"][aria-expanded]').first();
      const chevron = branch.locator(':scope > svg');
      await expect(chevron).toBeVisible();
      const m = await branch.evaluate((li) => {
        const svg = li.querySelector(':scope > svg');
        const button = li.querySelector(':scope > button');
        const leaf = li.parentElement.querySelector(':scope > li:not([aria-expanded])');
        const textLeft = (el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return range.getBoundingClientRect().left;
        };
        const s = svg.getBoundingClientRect();
        const b = button.getBoundingClientRect();
        return {
          size: s.width,
          centreDelta: Math.abs(s.top + s.height / 2 - (b.top + b.height / 2)),
          chevronBeforeLabel: s.right <= textLeft(button),
          alignDelta: Math.abs(textLeft(button) - textLeft(leaf)),
          transform: getComputedStyle(svg).transform,
          toggleInk: getComputedStyle(button).color,
          leafInk: getComputedStyle(leaf).color,
        };
      });
      expect(m.size).toBeGreaterThanOrEqual(12);
      expect(m.centreDelta).toBeLessThanOrEqual(2);
      expect(m.chevronBeforeLabel).toBe(true);
      // Sibling labels share one text edge, branch or leaf.
      expect(m.alignDelta).toBeLessThanOrEqual(2);
      // Expanded turns the chevron down.
      expect(m.transform).not.toBe('none');
      // The toggle names a branch; it reads in the item ink, not the link tint.
      expect(m.toggleInk).toBe(m.leafInk);
      await chevron.click();
      await expect(branch).toHaveAttribute('aria-expanded', 'false');
      await expect
        .poll(() => chevron.evaluate((svg) => getComputedStyle(svg).transform))
        .toBe('none');
      await chevron.click();
      await expect(branch).toHaveAttribute('aria-expanded', 'true');
    });
  }
});

test.describe('Specimens — datagrid', () => {
  test('the sort button flips the order and the aria-sort direction', async ({ page }) => {
    await mounted(page, '/components/datagrid');
    const table = page.locator(`${PREVIEW} table`);
    const leads = () => table.locator('tbody tr').locator('td:nth-child(2)').allTextContents();
    await expect.poll(leads).toEqual(['Garcia', 'Nguyen']);
    await table.locator('thead th[aria-sort] button').click();
    await expect.poll(leads).toEqual(['Nguyen', 'Garcia']);
    await expect(table.locator('thead th[aria-sort]')).toHaveAttribute('aria-sort', 'descending');
  });
});

test.describe('Specimens — toolbar', () => {
  test('More toggles the overflow menu; Escape inside the bar closes it', async ({ page }) => {
    await mounted(page, '/components/toolbar');
    const bar = page.locator(`${PREVIEW} section[variant="toolbar"]`);
    await expect(bar.locator('menu li')).toHaveCount(2);
    const more = bar.locator('button[aria-expanded]');
    await more.click();
    await expect(bar.locator('menu li')).toHaveCount(0);
    await more.click();
    await expect(bar.locator('menu li')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(bar.locator('menu li')).toHaveCount(0);
    await expect(more).toBeFocused();
  });
});

test.describe('Specimens — search field, toast, alert', () => {
  test('the search field clear button empties the field and leaves', async ({ page }) => {
    await mounted(page, '/components/search-field');
    const root = page.locator(`${PREVIEW} search`);
    const input = root.locator('input');
    await expect(input).toHaveValue('panel');
    await root.locator('button', { hasText: 'Clear' }).click();
    await expect(input).toHaveValue('');
    await expect(root.locator('button', { hasText: 'Clear' })).toHaveCount(0);
  });

  test('a toast dismiss control removes its item', async ({ page }) => {
    await mounted(page, '/components/toast');
    const list = page.locator(`${PREVIEW} ol`);
    await expect(list.locator('li')).toHaveCount(2);
    await list.locator('li').first().locator('button').click();
    await expect(list.locator('li')).toHaveCount(1);
    await expect(list.locator('li')).toContainText('Payment failed');
  });

  test('an alert dismiss control removes the alert', async ({ page }) => {
    await mounted(page, '/components/alert');
    const alerts = page.locator(`${PREVIEW} aside`);
    await expect(alerts).toHaveCount(2);
    await alerts.first().locator('button').click();
    await expect(alerts).toHaveCount(1);
    await expect(alerts.first()).toContainText('Payment failed');
  });
});

test.describe('Specimens — theme toggle', () => {
  test('choosing Dark stamps the document; System clears the stored mode', async ({ page }) => {
    await mounted(page, '/components/theme-toggle');
    const fieldset = page.locator(`${PREVIEW} fieldset`);
    await fieldset.locator('input[value="dark"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('bn-theme')))
      .toBe('dark');
    await fieldset.locator('input[value="system"]').click();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('bn-theme')))
      .toBeNull();
  });
});

test.describe('Specimens — virtualizer and form', () => {
  test('scrolling the virtualizer swaps the rendered window', async ({ page }) => {
    await mounted(page, '/components/virtualizer');
    const list = page.locator(`${PREVIEW} ol#demo-leads`);
    const firstRow = () => list.locator('li:not([aria-hidden])').first().textContent();
    await expect.poll(firstRow).toContain('Lead 1');
    await list.evaluate((el) => {
      el.scrollTop = 44 * 30;
      el.dispatchEvent(new Event('scroll'));
    });
    await expect.poll(firstRow).toContain('Lead 29');
  });

  test('submitting the form specimen stays on the page', async ({ page }) => {
    await mounted(page, '/components/form');
    await page.locator(`${PREVIEW} form button[variant="primary"]`).click();
    await page.waitForTimeout(250);
    expect(page.url()).toContain('/components/form');
  });
});

test.describe('Specimens — one field measure', () => {
  // Every form specimen renders at one width: the pane on a phone,
  // --measure-field on a wide screen. Each used to size itself (the
  // popover select 271px beside a 511px native one, the combobox 213,
  // a bare input the whole 958px pane), so the catalog read as a set
  // of unrelated controls rather than one system.
  const FORM_PAGES = [
    'input',
    'textarea',
    'select',
    'combobox',
    'multiselect',
    'search-field',
    'field',
    'form',
  ];
  for (const width of [393, 1280]) {
    test(`form specimens share one width at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const widths = {};
      for (const slug of FORM_PAGES) {
        await mounted(page, `/components/${slug}`);
        widths[slug] = await page.$$eval(`${PREVIEW} > output > *`, (els) =>
          els.map((el) => Math.round(el.getBoundingClientRect().width)),
        );
      }
      const all = Object.values(widths).flat();
      const measure = Math.min(...all);
      expect(all.length).toBeGreaterThanOrEqual(FORM_PAGES.length);
      for (const [slug, list] of Object.entries(widths)) {
        for (const w of list) expect(w, `${slug} specimen width`).toBe(measure);
      }
      expect(measure).toBeLessThanOrEqual(448);
      if (width < 448 + 64) expect(measure).toBeGreaterThan(width - 96);
    });
  }
});

test.describe('Specimens — no-match popup', () => {
  // A filter that matches nothing collapses the popup instead of leaving
  // an empty, bordered listbox under the field.
  for (const name of ['combobox', 'multiselect']) {
    test(`${name}: no matches, no popup; a match brings it back`, async ({ page }) => {
      await mounted(page, `/components/${name}`);
      const root = page.locator(`${PREVIEW} section`).first();
      const input = root.locator('input').first();
      await input.click();
      await expect(root.locator('ul[role="listbox"]')).toBeVisible();
      await input.fill('zzzz');
      await expect(root.locator('ul[role="listbox"]')).toHaveCount(0);
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await input.fill('r');
      await expect(root.locator('ul[role="listbox"] li').first()).toBeVisible();
      await expect(input).toHaveAttribute('aria-expanded', 'true');
    });
  }
});

test.describe('Specimens — combobox end control', () => {
  // The chevron is the only control at the field's end: the engine's
  // search clear button must not draw beside it. Hiding it by force
  // must change no pixel of the focused, filled field.
  for (const scheme of ['light', 'dark']) {
    test(`no native clear button beside the chevron (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 393, height: 800 });
      await page.goto('/components/combobox/');
      const input = page.locator('[data-bn-component-preview] input[role="combobox"]').first();
      await input.focus();
      await page.keyboard.press('Escape');
      await input.evaluate((el) => {
        el.value = 'Orange County';
      });
      await page.addStyleTag({ content: '*{caret-color:transparent!important}' });
      const before = await input.screenshot({ animations: 'disabled' });
      await page.addStyleTag({
        content: 'input::-webkit-search-cancel-button{display:none!important}',
      });
      const after = await input.screenshot({ animations: 'disabled' });
      expect(Buffer.compare(before, after), 'native clear button drawn').toBe(0);
    });
  }
});

test.describe('Specimens — combobox chevron', () => {
  // A combobox opens a list, so it shows the select's chevron: centred
  // on the field (within 1px) open and closed, inside its end padding,
  // turned when open, and transparent to the pointer so a tap on it
  // reaches the input.
  for (const width of [320, 1280]) {
    test(`the chevron sits centred in the field and flips open at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mounted(page, '/components/combobox');
      const root = page.locator(`${PREVIEW} section`).first();
      const input = root.locator('input');
      const chevron = root.locator(':scope > svg');
      await expect(chevron).toHaveCount(1);
      await root.scrollIntoViewIfNeeded();
      const geometry = () =>
        root.evaluate((el) => {
          const i = el.querySelector('input').getBoundingClientRect();
          const v = el.querySelector(':scope > svg').getBoundingClientRect();
          const hit = document.elementFromPoint((v.left + v.right) / 2, (v.top + v.bottom) / 2);
          return {
            dy: (v.top + v.bottom) / 2 - (i.top + i.bottom) / 2,
            inside: v.left > i.left && v.right < i.right,
            textEnd:
              i.right - parseFloat(getComputedStyle(el.querySelector('input')).paddingInlineEnd),
            chevronStart: v.left,
            hitsInput: hit === el.querySelector('input'),
            transform: getComputedStyle(el.querySelector(':scope > svg')).transform,
          };
        });
      const closed = await geometry();
      expect(Math.abs(closed.dy)).toBeLessThanOrEqual(1);
      expect(closed.inside).toBe(true);
      expect(closed.textEnd).toBeLessThanOrEqual(closed.chevronStart);
      expect(closed.hitsInput).toBe(true);

      await input.focus();
      await expect(input).toHaveAttribute('aria-expanded', 'true');
      await expect
        .poll(async () => (await geometry()).transform)
        .toBe('matrix(-1, 0, 0, -1, 0, 0)');
      const open = await geometry();
      expect(Math.abs(open.dy)).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('Specimens — select keyboard and checkmark', () => {
  // The open list follows the APG listbox button: the arrows move an
  // active row (fill) that is distinct from the chosen value (checkmark),
  // Enter commits the active row, and only the chosen row draws its check.
  test('arrows move the active row; Enter chooses it; the check marks only the chosen row', async ({
    page,
  }) => {
    await mounted(page, '/components/select');
    const root = page.locator(`${PREVIEW} section[variant="select"]`);
    const button = root.locator('button');
    const rows = root.locator('ul[role="listbox"] li');
    const checkVisible = () =>
      rows.evaluateAll((lis) =>
        lis.map((li) => getComputedStyle(li.querySelector('svg')).visibility === 'visible'),
      );
    await button.focus();
    await page.keyboard.press('ArrowDown');
    await expect(button).toHaveAttribute('aria-activedescendant', 'demo-trade-option-hvac');
    expect(await checkVisible()).toEqual([false, false, true]);
    await page.keyboard.press('ArrowUp');
    await expect(button).toHaveAttribute('aria-activedescendant', 'demo-trade-option-plumbing');
    await expect(rows.nth(1)).toHaveAttribute('variant', 'active');
    await expect(rows.nth(2)).not.toHaveAttribute('variant', 'active');
    await page.keyboard.press('Home');
    await expect(button).toHaveAttribute('aria-activedescendant', /electrical/);
    await page.keyboard.press('p');
    await expect(button).toHaveAttribute('aria-activedescendant', /plumbing/);
    await page.keyboard.press('Enter');
    await expect(root.locator('ul[role="listbox"]')).toHaveCount(0);
    await expect(button).toHaveText(/Plumbing/);
    await page.keyboard.press('ArrowDown');
    expect(await checkVisible()).toEqual([false, true, false]);
  });
});

test.describe('Specimens — multiselect chips', () => {
  // Each chip's ✕ is a 44px target named for its own option, drawn
  // inside a compact pill; the search field draws no native clear
  // button beside the chips' own dismiss controls.
  test('every chip ✕ is a 44px target named for its option, inside a compact chip', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 800 });
    await mounted(page, '/components/multiselect');
    const root = page.locator(`${PREVIEW} section`);
    await root.locator('input').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const chips = root.locator(':scope > ul:not([role]) > li');
    await expect(chips).toHaveCount(2);
    const facts = await chips.evaluateAll((lis) =>
      lis.map((li) => {
        const button = li.querySelector('button');
        const chip = li.getBoundingClientRect();
        const target = button.getBoundingClientRect();
        return {
          name: button.textContent.trim(),
          label: li.textContent.replace(button.textContent, '').trim(),
          chipHeight: chip.height,
          width: target.width,
          height: target.height,
        };
      }),
    );
    for (const fact of facts) {
      expect(fact.name, 'the ✕ is named for its own chip').toBe(`Remove ${fact.label}`);
      expect(fact.width).toBeGreaterThanOrEqual(44);
      expect(fact.height).toBeGreaterThanOrEqual(44);
      expect(fact.chipHeight, 'the pill stays compact').toBeLessThanOrEqual(36);
    }
  });

  for (const scheme of ['light', 'dark']) {
    test(`no native clear button in the search field (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 393, height: 800 });
      await mounted(page, '/components/multiselect');
      const input = page.locator(`${PREVIEW} section > input`);
      await input.focus();
      await page.keyboard.press('Escape');
      await input.evaluate((el) => {
        el.value = 'Light';
      });
      await page.addStyleTag({ content: '*{caret-color:transparent!important}' });
      const before = await input.screenshot({ animations: 'disabled' });
      await page.addStyleTag({
        content: 'input::-webkit-search-cancel-button{display:none!important}',
      });
      const after = await input.screenshot({ animations: 'disabled' });
      expect(Buffer.compare(before, after), 'native clear button drawn').toBe(0);
    });
  }
});

test.describe('Specimens — coarse-pointer option rows', () => {
  // On touch, every listbox row is at least the 44px target.
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 393, height: 800 } });
  for (const [route, open] of [
    ['/components/select', `${PREVIEW} section[variant="select"] > button`],
    ['/components/multiselect', `${PREVIEW} section > input`],
  ]) {
    test(`${route} rows are ≥44px under a coarse pointer`, async ({ page }) => {
      await mounted(page, route);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      await page.locator(open).tap();
      const rows = page.locator(`${PREVIEW} ul[role="listbox"] li`);
      await expect(rows.first()).toBeVisible();
      const heights = await rows.evaluateAll((lis) =>
        lis.map((li) => li.getBoundingClientRect().height),
      );
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
    });
  }
});

test.describe('Specimens — fieldset legends align with their options', () => {
  // A group's legend starts on the same edge as the controls it names
  // (within 1px): no inherited site padding pushes it off the column.
  for (const width of [320, 393, 1280]) {
    for (const [route, first] of [
      ['/components/radio', 'fieldset > label'],
      ['/components/choice-group', 'fieldset > label'],
    ]) {
      test(`${route} legend sits on the options' edge at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await mounted(page, route);
        const fieldset = page.locator(`${PREVIEW} fieldset`).first();
        const [legendX, optionX] = await fieldset.evaluate((el, sel) => {
          const legend = el.querySelector(':scope > legend');
          const range = document.createRange();
          range.selectNodeContents(legend);
          const option = el.parentElement.querySelector(sel);
          return [range.getBoundingClientRect().left, option.getBoundingClientRect().left];
        }, first);
        expect(Math.abs(legendX - optionX)).toBeLessThanOrEqual(1);
      });
    }
  }
});

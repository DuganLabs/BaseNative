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

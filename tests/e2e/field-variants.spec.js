import { test, expect } from '@playwright/test';

// The field and input variants, proven by interaction (t228u-b). Before
// them the field had one shape: a label, a bare control and a hint. A
// password could not be shown, a search not cleared, a number not
// stepped, a code not pasted, a file not dropped, and the catalog showed
// none of it.

const PREVIEW = '[data-bn-component-preview]';

async function mounted(page, path) {
  await page.goto(path);
  await page.waitForSelector('html[data-bn-specimens-mounted]');
}

const box = (loc) =>
  loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });

test.describe('Field variants — behaviour', () => {
  test('Show reveals the password as a toggle and hides it again', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-password`);
    const show = page.locator(`${PREVIEW} button[aria-controls="demo-field-password"]`);
    await input.fill('hunter22');
    await expect(input).toHaveAttribute('type', 'password');
    await expect(show).toHaveAttribute('aria-pressed', 'false');
    await show.click();
    await expect(input).toHaveAttribute('type', 'text');
    await expect(show).toHaveAttribute('aria-pressed', 'true');
    await expect(input).toHaveValue('hunter22');
    await show.click();
    await expect(input).toHaveAttribute('type', 'password');
  });

  test('Clear empties the search, hides itself and returns focus', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-search`);
    const clear = page.locator(`${PREVIEW} button[aria-controls="demo-field-search"]`);
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(clear).toBeHidden();
    await input.fill('roof');
    await expect(clear).toBeVisible();
  });

  test('the stepper steps the native input and disables at its bounds', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-stepper`);
    const up = page.locator(`${PREVIEW} button[value="up"][aria-controls="demo-field-stepper"]`);
    const down = page.locator(
      `${PREVIEW} button[value="down"][aria-controls="demo-field-stepper"]`,
    );
    const start = Number(await input.inputValue());
    await up.click();
    await expect(input).toHaveValue(String(start + 1));
    await input.fill('1');
    await input.dispatchEvent('input');
    await expect(down).toBeDisabled();
    await expect(up).toBeEnabled();
    await input.fill('12');
    await input.dispatchEvent('input');
    await expect(up).toBeDisabled();
    await down.click();
    await expect(input).toHaveValue('11');
    await expect(up).toBeEnabled();
  });

  test('the counter tracks the textarea as it is typed', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-notes`);
    const count = page.locator(`${PREVIEW} #demo-field-notes-count`);
    await input.fill('Ring twice.');
    await expect(count).toHaveText('11 / 140');
  });

  test('a pasted code spreads across the boxes into the hidden value', async ({ page }) => {
    await mounted(page, '/components/field');
    const field = page.locator(`${PREVIEW} section[variant="code"]`);
    const boxes = field.locator('fieldset > input:not([type="hidden"])');
    await expect(boxes).toHaveCount(6);
    await boxes.first().fill('482913');
    for (const [i, d] of [...'482913'].entries()) await expect(boxes.nth(i)).toHaveValue(d);
    await expect(field.locator('input[type="hidden"][name="code"]')).toHaveValue('482913');
    await expect(boxes.first()).toHaveAttribute('autocomplete', 'one-time-code');
  });

  test('the drop zone names the chosen files', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-files`);
    const files = page.locator(`${PREVIEW} #demo-field-files-files`);
    await expect(files).toHaveText('No files selected');
    await input.setInputFiles([
      { name: 'roof.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') },
      { name: 'quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('y') },
    ]);
    await expect(files).toContainText('roof.jpg');
    await expect(files).toContainText('quote.pdf');
  });

  test('a group names its fields with a legend', async ({ page }) => {
    await mounted(page, '/components/field');
    const group = page.getByRole('group', { name: 'Site address' });
    await expect(group).toBeVisible();
    await expect(group.getByLabel('Street')).toBeVisible();
    await expect(group.getByLabel('City')).toBeVisible();
  });
});

test.describe('Field variants — measure', () => {
  for (const width of [320, 393, 1440]) {
    test(`every built-in button and code box is a 44px target at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mounted(page, '/components/field');
      const targets = page.locator(
        `${PREVIEW} section[variant] > fieldset > button:visible, ${PREVIEW} section[variant="code"] > fieldset > input:not([type="hidden"])`,
      );
      expect(await targets.count()).toBeGreaterThan(10);
      for (const t of await targets.all()) {
        const { w, h } = await box(t);
        expect(w, await t.evaluate((e) => e.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44);
        expect(h).toBeGreaterThanOrEqual(44);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('the required mark sits on the label line, not under it', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 900 });
    await mounted(page, '/components/field');
    const label = page.locator(`${PREVIEW} label[for="demo-field-name"]`);
    const { h } = await box(label);
    const line = await label.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect(h).toBeLessThanOrEqual(line + 1);
  });

  test('input sizes step up and every size stays a 44px target', async ({ page }) => {
    await mounted(page, '/components/input');
    const sizes = await Promise.all(
      ['demo-input-sm', 'demo-input-md', 'demo-input-lg'].map((id) =>
        box(page.locator(`${PREVIEW} #${id}`)),
      ),
    );
    for (const s of sizes) expect(s.h).toBeGreaterThanOrEqual(44);
    expect(sizes[2].h).toBeGreaterThan(sizes[1].h);
    const fonts = await Promise.all(
      ['demo-input-sm', 'demo-input-lg'].map((id) =>
        page.locator(`${PREVIEW} #${id}`).evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
      ),
    );
    expect(fonts[0]).toBeGreaterThanOrEqual(16);
    expect(fonts[1]).toBeGreaterThan(fonts[0]);
  });
});

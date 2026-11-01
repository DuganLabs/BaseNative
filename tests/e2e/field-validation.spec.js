import { test, expect } from '@playwright/test';

// The field reports, proven by interaction: the catalog's fields
// carry real constraints (required, type, pattern, min/max), and the
// field's own behaviour (bindFieldValidation) turns the browser's
// validity into the field's report — aria-invalid on the control, the
// message in the field's <output> in place of its hint, and
// aria-describedby pointing at whichever is showing. Before it, a
// field never reported: typing "nope" into an email field and leaving
// it changed nothing.

const PREVIEW = '[data-bn-component-preview]';

async function mounted(page, path) {
  await page.goto(path);
  await page.waitForSelector('html[data-bn-specimens-mounted]');
}

test.describe('Field — validation reports and clears', () => {
  test('an invalid email reports on blur and clears as it is fixed', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-email`);
    const field = page.locator(`${PREVIEW} section[variant="field"]:has(#demo-field-email)`);
    await input.fill('nope');
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await input.blur();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    const error = field.locator(':scope > output');
    await expect(error).toBeVisible();
    await expect(error).not.toHaveText('');
    await expect(field.locator(':scope > small')).toBeHidden();
    const errorId = await error.getAttribute('id');
    await expect(input).toHaveAttribute('aria-describedby', errorId);
    // The error reads in the field's error colour, not the hint's.
    const colors = await field.evaluate((f) => ({
      error: getComputedStyle(f.querySelector(':scope > output')).color,
      hint: getComputedStyle(f.querySelector(':scope > small')).color,
    }));
    expect(colors.error).not.toBe(colors.hint);

    await input.fill('crew@example.com');
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await expect(field.locator(':scope > output')).toHaveCount(0);
    await expect(field.locator(':scope > small')).toBeVisible();
    await expect(input).toHaveAttribute('aria-describedby', 'demo-field-email-hint');
  });

  test('a pattern mismatch reports the title; min/max report out of range', async ({ page }) => {
    await mounted(page, '/components/field');
    const zip = page.locator(`${PREVIEW} #demo-field-zip`);
    await zip.fill('12');
    await zip.blur();
    await expect(zip).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`${PREVIEW} #demo-field-zip-error`)).toHaveText(
      'Enter a five-digit ZIP code.',
    );
    await zip.fill('94110');
    await expect(zip).not.toHaveAttribute('aria-invalid', 'true');

    const crew = page.locator(`${PREVIEW} #demo-field-crew`);
    await crew.fill('40');
    await crew.blur();
    await expect(crew).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`${PREVIEW} #demo-field-crew-error`)).toBeVisible();
    await crew.fill('4');
    await expect(crew).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('the server-rendered error clears once the value is valid', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-email2`);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute('aria-describedby', 'demo-field-email2-error');
    await input.fill('crew@example.com');
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`${PREVIEW} #demo-field-email2-error`)).toHaveCount(0);
    await expect(page.locator(`${PREVIEW} #demo-field-email2-hint`)).toBeVisible();
  });

  test('an empty required field does not report before it is edited', async ({ page }) => {
    await mounted(page, '/components/field');
    const input = page.locator(`${PREVIEW} #demo-field-email`);
    await input.focus();
    await input.blur();
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('Form — submit reports every field', () => {
  test('an empty submit reports both required fields and focuses the first', async ({ page }) => {
    await mounted(page, '/components/form');
    const form = page.locator(`${PREVIEW} form`);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(`${PREVIEW} #demo-q-name`)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`${PREVIEW} #demo-q-email`)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`${PREVIEW} #demo-q-name`)).toBeFocused();
    await expect(form.locator(':scope > output')).toHaveCount(0);
    expect(page.url()).toContain('/components/form');
  });

  test('a valid submit stays on the page and acknowledges it', async ({ page }) => {
    await mounted(page, '/components/form');
    const form = page.locator(`${PREVIEW} form`);
    await page.locator(`${PREVIEW} #demo-q-name`).fill('Ada');
    await page.locator(`${PREVIEW} #demo-q-email`).fill('ada@example.com');
    await form.locator('button[type="submit"]').click();
    await expect(form.locator(':scope > output')).toHaveText(/Quote requested/);
    expect(page.url()).toContain('/components/form');
    await expect(page.locator(`${PREVIEW} [aria-invalid="true"]`)).toHaveCount(0);
  });
});

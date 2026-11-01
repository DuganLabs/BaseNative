import { test, expect } from '@playwright/test';
import { ROUTES } from './audit-routes.js';

// Warren, 2026-11-01 (t228u-c): the custom select is the default
// everywhere — components, docs, site, Builder, Playground, bento. The
// platform <select> is a documented opt-in, the select's "native"
// variant, and nothing else may render one.
const bareNativeSelects = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('select')]
      .filter(
        (el) =>
          !(el.getAttribute('variant') === 'native' && el.closest('section[variant="native"]')),
      )
      .map((el) => el.id || el.name || el.outerHTML.slice(0, 80)),
  );

for (const route of ROUTES) {
  test(`${route} renders no bare native <select>`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    expect(await bareNativeSelects(page)).toEqual([]);
  });
}

test('the native variant appears only where a page opts into it', async ({ page }) => {
  const opted = [];
  for (const route of ROUTES) {
    await page.goto(route);
    if ((await page.locator('section[variant="native"] > select').count()) > 0) opted.push(route);
  }
  // The select page documents the opt-in; nowhere else uses it.
  expect(opted).toEqual(['/components/select/']);
});

test('the home bento plan picker is the custom select and chooses', async ({ page }) => {
  await page.goto('/');
  await page.locator('html[data-bn-specimens-mounted]').waitFor({ state: 'attached' });
  const trigger = page.locator('section[variant="select"] > button#home-plan');
  await expect(trigger).toHaveText('Pro');
  await trigger.click();
  await page.locator('#home-plan-option-team').click();
  await expect(trigger).toHaveText('Team');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('the playground example picker is the custom select and loads the choice', async ({
  page,
}) => {
  await page.goto('/playground');
  await page.locator('html[data-bn-specimens-mounted]').waitFor({ state: 'attached' });
  const trigger = page.locator('section[variant="select"] > button#exampleSelect');
  await trigger.click();
  await page.locator('#exampleSelect-option-greeting').click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.frameLocator('#preview').locator('section[variant="card"] > h2')).toHaveText(
    'Hello, Ada Lovelace.',
  );
});

test('the Builder inspector edits an enum prop with the custom select', async ({ page }) => {
  await page.goto('/builder/');
  await page
    .locator('bn-builder-palette button', { hasText: /^Stack/ })
    .first()
    .click();
  const stack = page.locator('bn-builder-canvas [data-bn-type="stack"]').first();
  await stack.click({ position: { x: 8, y: 8 } });
  const trigger = page.locator('bn-builder-inspector section[variant="select"] > button');
  await expect(trigger).toHaveText('column');
  expect(await bareNativeSelects(page)).toEqual([]);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.locator('bn-builder-inspector [role="option"]', { hasText: 'row' }).click();
  await expect(stack).toHaveAttribute('direction', 'row');
  await expect(trigger).toHaveText('row');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  // The keyboard path keeps focus on the trigger through the re-render.
  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(stack).toHaveAttribute('direction', 'column');
  await expect(trigger).toBeFocused();
});

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

test('the enterprise New User form uses the custom select and submits its choice', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.goto('http://localhost:3001/users/new');
  const trigger = page.locator('#role');
  await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  expect(await bareNativeSelects(page)).toEqual([]);
  expect((await trigger.boundingBox()).height).toBeGreaterThanOrEqual(44);

  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#role-option-Editor').click();
  await expect(trigger).toHaveText('Editor');
  await expect(page.locator('input[type="hidden"][name="role"]')).toHaveValue('Editor');

  await page.locator('#name').fill('Grace Hopper');
  await page.locator('#email').fill('grace@example.com');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/users\/\d+$/);
  await expect(page.locator('dd').nth(2)).toHaveText('Editor');
  expect(errors).toEqual([]);
});

// The configurator example (examples/configurator) is a static page that
// imports the runtime by relative path, so it is served here from the repo
// root through a route handler: no extra server.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};
const configurator = async (page) => {
  await page.route('http://configurator.test/**', async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    try {
      const body = await readFile(join(repoRoot, path));
      await route.fulfill({ body, contentType: mime[extname(path)] ?? 'application/octet-stream' });
    } catch {
      await route.fulfill({ status: 404, body: 'not found' });
    }
  });
  await page.goto('http://configurator.test/examples/configurator/index.html');
  await page.waitForLoadState('networkidle');
};

for (const width of [320, 1280]) {
  test(`configurator @${width}: every picker is the custom select`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await configurator(page);
    await page.getByRole('button', { name: '+ Add Window' }).click();
    await expect(page.locator('[data-bn="window-entry"]')).toHaveCount(1);
    expect(await bareNativeSelects(page)).toEqual([]);
    const triggers = page.locator('section[variant="select"] > button[aria-haspopup="listbox"]');
    await expect(triggers).toHaveCount(5);
    for (const trigger of await triggers.all()) {
      const box = await trigger.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      // A label that wraps on a phone reads from the start edge, like a field.
      expect(await trigger.evaluate((el) => getComputedStyle(el).textAlign)).toMatch(
        /^(start|left)$/,
      );
      expect(
        await trigger.evaluate(
          (el) => el.labels.length + (el.getAttribute('aria-labelledby') ? 1 : 0),
        ),
      ).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    // The design system's tokens never replace the page's own (its sans
    // stack, its radii): they sit in a lower cascade layer.
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(
      /system-ui/,
    );
  });
}

test('configurator: choosing a panel updates the analysis', async ({ page }) => {
  await configurator(page);
  const exterior = page.getByRole('button', { name: /Exterior Panel/ });
  const before = await page.locator('[data-bn="r-total"]').textContent();
  await exterior.click();
  const options = page.getByRole('option');
  expect(await options.count()).toBeGreaterThan(1);
  const chosen = page.locator('[role="option"][aria-selected="false"]').first();
  const label = (await chosen.textContent()).trim();
  await chosen.click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(exterior).toContainText(label);
  await expect(page.locator('[data-bn="r-total"]')).not.toHaveText(before);
});

test('configurator: a window wall choice sticks and Escape closes', async ({ page }) => {
  await configurator(page);
  await page.getByRole('button', { name: '+ Add Window' }).click();
  const wall = page.getByRole('button', { name: /Wall/ }).first();
  await expect(wall).toContainText('South');
  await wall.click();
  await page.getByRole('option', { name: 'North' }).click();
  await expect(wall).toContainText('North');
  await page.getByRole('button', { name: '+ Add Window' }).click();
  await expect(page.getByRole('button', { name: /Wall/ })).toHaveCount(2);
  await expect(page.getByRole('button', { name: /Wall/ }).first()).toContainText('North');
  await wall.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
});

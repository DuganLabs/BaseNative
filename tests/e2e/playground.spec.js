import { test, expect } from '@playwright/test';

// /playground: the CodePen for BaseNative, built into the site. Its
// chrome is rendered server-side from @basenative/components, and the
// preview is a real route (/playground/preview) running the site's own
// runtime bundle — these tests prove the examples actually run there.
test.describe('Playground', () => {
  test('renders its chrome from the components catalog', async ({ page }) => {
    await page.goto('/playground');
    await expect(page.locator('section[variant="toolbar"]')).toBeVisible();
    await expect(page.locator('section[variant="native"] select#exampleSelect')).toBeVisible();
    await expect(page.locator('section[variant="toolbar"] button[variant="primary"]')).toHaveText(
      'Run',
    );
    await expect(page.locator('section[variant="tabs"]')).toBeVisible();
    await expect(page.locator('[data-pane="html"] textarea')).toBeVisible();
    await expect(page.locator('[data-pane="css"] textarea')).toBeVisible();
    await expect(page.locator('[data-pane="js"] textarea')).toBeVisible();
    // The console lives inside the JS panel, under its editor.
    await expect(page.locator('[data-pane="js"] .console-region #consoleList')).toBeAttached();
    await expect(page.locator('#preview')).toHaveAttribute('src', '/playground/preview');
  });

  test('the Counter example runs and its console line lands in the JS pane console', async ({
    page,
  }) => {
    await page.goto('/playground');
    const frame = page.frameLocator('#preview');
    const card = frame.locator('section[variant="card"]');
    // Interpolation rendered a value, not the raw {{ }} source.
    await expect(card.locator('> output')).toHaveText('0');
    await expect(card).not.toContainText('{{');
    // The example's console.log crossed into the console in the JS panel.
    await expect(
      page.locator('[data-pane="js"] .console-body li', { hasText: 'Counter mounted' }),
    ).toBeVisible();
    await expect(page.locator('#runStatus')).toContainText('Rendered');
    // And it is live: + moves the counter.
    await card.locator('> p button', { hasText: '+' }).click();
    await expect(card.locator('> output')).toHaveText('1');
  });

  test('switching examples runs the Greeter from its view model', async ({ page }) => {
    await page.goto('/playground');
    await page.selectOption('#exampleSelect', 'greeting');
    const frame = page.frameLocator('#preview');
    await expect(frame.locator('section[variant="card"] > h2')).toHaveText('Hello, Ada Lovelace.');
  });
});

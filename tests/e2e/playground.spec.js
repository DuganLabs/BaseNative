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

  test('runs at phone width, and the preview is never a white box in dark mode', async ({
    page,
  }) => {
    // Warren's phone, 2026-10-28: the playground sat at "Not run
    // yet" over a giant white result pane. The desktop-width tests
    // above never exercised the stacked phone layout, so the run
    // contract and the frame's dark paint are asserted here at
    // 390px in a dark scheme.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/playground');
    await expect(page.locator('#runStatus')).toContainText('Rendered');
    const frame = page.frameLocator('#preview');
    await expect(frame.locator('section[variant="card"] > output')).toHaveText('0');
    const previewFrame = page
      .frames()
      .find((f) => f.url().endsWith('/playground/preview'));
    const frameBg = await previewFrame.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(frameBg).not.toBe('rgb(255, 255, 255)');
  });

  test('framing headers: the site denies framing, its own preview allows it', async ({
    page,
  }) => {
    // The live playground sat at "Not run yet" over a white frame
    // because the Pages _headers denied framing on every path,
    // including the preview document the playground frames. The dev
    // server sends the same headers production does, so the
    // contract is asserted here, where a regression fails CI
    // instead of reaching a phone.
    const pageHeaders = (await page.request.get('/playground')).headers();
    expect(pageHeaders['x-frame-options']).toBe('DENY');
    const previewHeaders = (await page.request.get('/playground/preview')).headers();
    expect(previewHeaders['x-frame-options']).toBe('SAMEORIGIN');
    expect(previewHeaders['content-security-policy']).toContain("frame-ancestors 'self'");
  });

  test('switching examples runs the Greeter from its view model', async ({ page }) => {
    await page.goto('/playground');
    await page.selectOption('#exampleSelect', 'greeting');
    const frame = page.frameLocator('#preview');
    await expect(frame.locator('section[variant="card"] > h2')).toHaveText('Hello, Ada Lovelace.');
  });
});

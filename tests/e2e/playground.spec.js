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
    // Below three 360px panels the CSS and JS editors wait behind their tabs.
    await expect(page.locator('[data-pane="css"] textarea')).toBeAttached();
    await expect(page.locator('[data-pane="js"] textarea')).toBeAttached();
    // The console has its own area, outside the editor tabs.
    await expect(page.locator('section[aria-label="Console"] #consoleList')).toBeAttached();
    await expect(page.locator('#preview')).toHaveAttribute('src', '/playground/preview');
  });

  test('the Counter example runs and its console line lands in the console', async ({ page }) => {
    await page.goto('/playground');
    const frame = page.frameLocator('#preview');
    const card = frame.locator('section[variant="card"]');
    // Interpolation rendered a value, not the raw {{ }} source.
    await expect(card.locator('> output')).toHaveText('0');
    await expect(card).not.toContainText('{{');
    // The example's console.log crossed into the console.
    await expect(
      page.locator('section[aria-label="Console"] li', { hasText: 'Counter mounted' }),
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
    const previewFrame = page.frames().find((f) => f.url().endsWith('/playground/preview'));
    const frameBg = await previewFrame.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(frameBg).not.toBe('rgb(255, 255, 255)');
  });

  test('framing headers: the site denies framing, its own preview allows it', async ({ page }) => {
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

  // Warren, 2026-10-30: at 768 the three editors sat side by side at
  // 149px each. Panels go three-up only when each gets 360px; narrower,
  // the tab list shows one panel at the full width. The console keeps
  // its own area whichever tab is open.
  for (const width of [320, 393, 768, 1024, 1100, 1280, 1440, 1920]) {
    test(`panels are 360px or more, or one at a time, at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/playground');
      const geo = await page.evaluate(() => {
        const tabs = document.querySelector('section[variant="tabs"]');
        const panels = [...tabs.querySelectorAll(':scope > section[role="tabpanel"]')]
          .filter((p) => getComputedStyle(p).display !== 'none')
          .map((p) => p.getBoundingClientRect());
        const list = tabs.querySelector(':scope > ul[role="tablist"]');
        const console = document.querySelector('section[aria-label="Console"]');
        return {
          tabs: tabs.getBoundingClientRect().width,
          widths: panels.map((r) => r.width),
          tops: panels.map((r) => Math.round(r.top)),
          tablist: !!list && getComputedStyle(list).display !== 'none',
          console: !!console && console.getBoundingClientRect().height > 0,
        };
      });
      expect(geo.console, 'the console is visible').toBe(true);
      if (geo.widths.length > 1) {
        for (const w of geo.widths) expect(w, 'a side-by-side panel').toBeGreaterThanOrEqual(360);
        expect(geo.tablist, 'no tab list while every panel shows').toBe(false);
      } else {
        expect(geo.tablist, 'one panel at a time needs its tab list').toBe(true);
        expect(geo.widths[0], 'the one panel fills the width').toBeGreaterThanOrEqual(geo.tabs - 1);
      }
    });
  }

  // The stack primitive gave the editor's code sheet a 16px top margin:
  // the line numbers sat a line above the code they number, and the
  // caret a line off the highlighted text.
  test('the gutter, the highlighted code and the textarea share one top', async ({ page }) => {
    await page.goto('/playground');
    for (const lang of ['html', 'css', 'js']) {
      await page.locator(`[role="tab"]`, { hasText: lang.toUpperCase() }).first().click();
      const tops = await page.evaluate((lang) => {
        const e = document.querySelector(`[data-pane="${lang}"] .editor`);
        return ['.gutter', '.hl', 'textarea'].map((s) =>
          Math.round(e.querySelector(s).getBoundingClientRect().top),
        );
      }, lang);
      expect(new Set(tops).size, `${lang}: gutter/hl/textarea tops ${tops}`).toBe(1);
    }
  });

  // With the console in its own area under the result, a log line's
  // scrollIntoView scrolled the whole page down to it on load. A new
  // line scrolls the console, never the page.
  test('a console line scrolls the console, not the page', async ({ page }) => {
    await page.goto('/playground');
    await expect(
      page.locator('section[aria-label="Console"] li', { hasText: 'Counter mounted' }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

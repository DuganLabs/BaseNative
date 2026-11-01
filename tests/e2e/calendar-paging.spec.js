import { test, expect } from '@playwright/test';

// The month calendar pages. Its Previous and Next buttons were
// caller-rendered buttons over a static, caller-rendered grid: clicking
// them changed nothing. The calendar now renders its own grid from its
// year/month state and its buttons page it; the title (a polite live
// region) announces the month and each button names where it goes.

const PREVIEW = '[data-bn-component-preview]';
const MONTH = `${PREVIEW} section[variant="month"]`;

async function mounted(page, path) {
  await page.goto(path);
  await page.waitForSelector('html[data-bn-specimens-mounted]');
}

test.describe('Calendar — month paging', () => {
  test('Next and Previous page the month, its grid and its title', async ({ page }) => {
    await mounted(page, '/components/calendar');
    const cal = page.locator(MONTH);
    await expect(cal.locator('h2')).toHaveText('October 2026');
    await expect(cal.locator('td[aria-current="date"]')).toHaveText('24');
    const next = cal.getByRole('button', { name: /Next month, November 2026/ });
    await next.click();
    await expect(cal.locator('h2')).toHaveText('November 2026');
    await expect(cal).toHaveAttribute('aria-label', 'November 2026');
    // November 2026 starts on a Sunday: the first cell is the 1st, in month.
    await expect(cal.locator('tbody tr:first-child td:first-child')).toHaveText('1');
    await expect(cal.locator('tbody tr:first-child td:first-child small')).toHaveCount(0);
    await expect(cal.locator('td[aria-current="date"]')).toHaveCount(0);
    await cal.getByRole('button', { name: /Previous month, October 2026/ }).click();
    await cal.getByRole('button', { name: /Previous month, September 2026/ }).click();
    await expect(cal.locator('h2')).toHaveText('September 2026');
    await cal.getByRole('button', { name: /Next month, October 2026/ }).click();
    await expect(cal.locator('td[aria-current="date"]')).toHaveText('24');
  });

  test('the year rolls over at both ends', async ({ page }) => {
    await mounted(page, '/components/calendar');
    const cal = page.locator(MONTH);
    for (let i = 0; i < 3; i += 1) await cal.getByRole('button', { name: /^Next month/ }).click();
    await expect(cal.locator('h2')).toHaveText('January 2027');
    await cal.getByRole('button', { name: /^Previous month/ }).click();
    await expect(cal.locator('h2')).toHaveText('December 2026');
  });

  test('the paging buttons are 44px targets', async ({ page }) => {
    await mounted(page, '/components/calendar');
    for (const b of await page.locator(`${MONTH} header button`).all()) {
      const box = await b.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });
});

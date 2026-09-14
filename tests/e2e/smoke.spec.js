import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');

test.describe('Express Example', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BaseNative/i);
  });

  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.locator('h1, h2, [data-bn]').first()).toBeVisible();
  });

  test('components page loads', async ({ page }) => {
    await page.goto('/components');
    await expect(page.locator('body')).toContainText(/component/i);
  });
});

test.describe('Enterprise Example', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await expect(page.locator('body')).toContainText(/dashboard/i);
  });

  test('users page loads', async ({ page }) => {
    await page.goto('http://localhost:3001/users');
    await expect(page.locator('body')).toContainText(/user/i);
  });

  test('API creates user', async ({ request }) => {
    const response = await request.post('http://localhost:3001/api/users', {
      data: { name: 'Test User', email: 'test@example.com', role: 'Viewer' },
    });
    expect(response.ok()).toBeTruthy();
    const user = await response.json();
    expect(user.name).toBe('Test User');
  });
});

// Demo behaviour that only a browser can prove: the dialog's × on
// /components/dialog had no listener, and /showcase's pager was eight real
// links to ?page=N that reloaded the page and lost the scroll position.
test.describe('Component demos', () => {
  test('the dialog × closes the dialog on /components/dialog', async ({ page }) => {
    await page.goto('/components/dialog');
    const dialog = page.locator('#demo-dialog-page');
    await page.locator('[data-bn-demo-dialog-open]').click();
    await expect(dialog).toHaveJSProperty('open', true);
    await dialog.locator('[data-bn="dialog-close"]').click();
    await expect(dialog).toHaveJSProperty('open', false);
  });

  test('the /showcase pager moves the current page in place', async ({ page }) => {
    await page.goto('/showcase');
    const nav = page.locator('[data-bn="pagination"]').first();
    await nav.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(0);
    await nav.getByRole('link', { name: '2', exact: true }).click();
    await expect(nav.locator('[aria-current="page"]')).toHaveText('2');
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    expect(new URL(page.url()).pathname).toBe('/showcase');
  });
});

// The static build has no /api/tasks. Its /tasks must say so and keep the
// visitor's tasks in the browser across a reload. Served from dist/ here —
// the dev server on :3000 has the API and would pass for the wrong reason.
test.describe('Static /tasks', () => {
  test.skip(!existsSync(join(DIST, 'tasks', 'index.html')), 'run `pnpm build:pages` first');

  let server;
  let base;

  test.beforeAll(async () => {
    server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = join(DIST, path);
      if (!extname(file)) file = join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('discloses browser-only storage and keeps an added task across a reload', async ({
    page,
  }) => {
    await page.goto(`${base}/tasks/`);
    await expect(page.locator('[data-tasks-static-notice]')).toContainText(
      /not saved to a server/i,
    );
    const title = `Persist me ${Date.now()}`;
    await page.getByLabel('New task title').fill(title);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.locator('[data-task-title]', { hasText: title })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-task-title]', { hasText: title })).toBeVisible();
  });
});

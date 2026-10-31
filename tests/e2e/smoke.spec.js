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

  test('tasks demo loads on /components', async ({ page }) => {
    await page.goto('/components#tasks');
    await expect(page.locator('section#tasks [data-tasks]')).toBeVisible();
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

// Demo behaviour that only a browser can prove: a staged dialog
// dismissing. The pre-trinity demo this gate opened (an opener
// button, #demo-dialog-page, a [data-bn="dialog-close"] hook) is
// gone — the catalog specimens stage open in flow now, and the
// dialog component's own behavior dismisses a staged dialog from
// its header close control (specimens.js only mounts it). The gate
// proves that behavior on the dialog page itself.
test.describe('Component demos', () => {
  test('the staged dialog dismisses from its Close button on /components/dialog', async ({
    page,
  }) => {
    await page.goto('/components/dialog');
    await page.getByRole('button', { name: 'Archive this job' }).click();
    const dialog = page.locator('dialog[variant="default"]');
    await expect(dialog).toHaveJSProperty('open', true);
    await dialog.locator('header button').click();
    await expect(dialog).toHaveJSProperty('open', false);
  });
});

// A second behaviour gate stood here: the /showcase pager moving the
// current page in place. /showcase was retired in the route
// consolidation (its specimens live on the catalog pages now,
// rendered as static state specimens), so there is no live pager
// left to prove; the gate went with the route.

// The static build has no /api/tasks. The tasks demo on its /components
// page must say so and keep the visitor's tasks in the browser across a
// reload. Served from dist/ here — the dev server on :3000 has the API
// and would pass for the wrong reason.
test.describe('Static /components tasks demo', () => {
  test.skip(!existsSync(join(DIST, 'components', 'index.html')), 'run `pnpm build:pages` first');

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
    await page.goto(`${base}/components/#tasks`);
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

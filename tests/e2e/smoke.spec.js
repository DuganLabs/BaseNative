import { test, expect } from '@playwright/test';

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

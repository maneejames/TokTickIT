import { test, expect } from '@playwright/test';

test.describe('Authentication & Password Change E2E Tests', () => {
  test('AUTH-E2E-01: End-to-end login, view profile, refresh session, and logout', async ({ page }) => {
    // 1. Navigate to application root
    await page.goto('/');

    // 2. Submit valid credentials for Somchai Jaidee (Requester)
    await page.fill('#login-email', 'somchai.jai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 3. Verify successful authenticated landing
    await expect(page.locator('header')).toContainText('TokTickIT');
    await expect(page.locator('body')).toContainText(/My Tickets/i);

    // 4. Verify session persistence on page reload
    await page.reload();
    await expect(page.locator('header')).toContainText('TokTickIT');
    await expect(page.locator('body')).toContainText(/My Tickets/i);

    // 5. Logout and verify return to Login screen
    const logoutBtn = page.getByRole('button', { name: /logout/i });
    await logoutBtn.click();
    await expect(page.locator('body')).toContainText(/Sign in to TokTickIT/i);
    await expect(page.locator('#login-email')).toBeVisible();
  });

  test('AUTH-E2E-02: First login password change barrier and completion flow', async ({ page }) => {
    // 1. Navigate to application root
    await page.goto('/');

    // 2. Log in with user having mustChangePassword: true (temp.req@kmutt.ac.th)
    await page.fill('#login-email', 'temp.req@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 3. Verify barrier locks to Change Password screen
    await expect(page.locator('body')).toContainText(/Change Temporary Password/i);
    await expect(page.locator('#new-password')).toBeVisible();

    // 4. Fill and submit new password satisfying complexity
    await page.fill('#current-password', 'Password123!');
    await page.fill('#new-password', 'NewSecurePass456!');
    await page.fill('#confirm-password', 'NewSecurePass456!');
    await page.click('button[type="submit"]');

    // 5. Verify successful change and transition into the application
    await expect(page.locator('body')).toContainText(/My Tickets/i);
  });

  test.afterAll(async ({ request }) => {
    // Reset temp.req back to mustChangePassword: true with Password123!
    try {
      const loginRes = await request.post('http://localhost:3000/api/auth/login', {
        data: { email: 'admin@kmutt.ac.th', password: 'Password123!' },
      });
      const cookie = loginRes.headers()['set-cookie'];
      const usersRes = await request.get('http://localhost:3000/api/admin/users?search=temp.req', {
        headers: cookie ? { cookie } : {},
      });
      const users = await usersRes.json();
      const tempUser = users.find((u: { email: string; id: number }) => u.email === 'temp.req@kmutt.ac.th');
      if (tempUser) {
        await request.post(`http://localhost:3000/api/admin/users/${tempUser.id}/reset-password`, {
          headers: cookie ? { cookie } : {},
          data: { newInitialPassword: 'Password123!' },
        });
      }
    } catch (_err) {
      // Ignore cleanup error if already reset
    }
  });
});


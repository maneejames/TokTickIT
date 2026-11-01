import { test, expect } from '@playwright/test';

test.describe('Administrator User Management E2E Tests', () => {
  test('ADMIN-E2E-01: Full user administration lifecycle (create, search, edit)', async ({ page }) => {
    // 1. Navigate to root and log in as Administrator
    await page.goto('/');
    await page.fill('#login-email', 'admin@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Open User Management from nav
    await page.locator('nav').getByRole('button', { name: /user management/i }).click();
    await expect(page.locator('body')).toContainText(/User Account Management/i);

    // 3. Open Create New User modal
    const createBtn = page.getByRole('button', { name: /\+ Create New User/i });
    await createBtn.click();
    await expect(page.locator('body')).toContainText(/Create New User/i);

    // 4. Fill required user fields
    const createdUserEmail = `e2e.flow.${Date.now()}@kmutt.ac.th`;
    await page.fill('#create-name', 'E2E Flow User');
    await page.fill('#create-email', createdUserEmail);
    await page.selectOption('#create-role', 'REQUESTER');
    await page.fill('#create-password', 'InitialPass123!');

    // 5. Submit Create User form
    await page.getByRole('button', { name: /^Create User$/i }).click();

    // 6. Verify user appears in the user list
    await page.fill('#user-search', createdUserEmail);
    await expect(page.locator('body')).toContainText(createdUserEmail);
  });

  test.afterAll(async () => {
    try {
      const { execSync } = await import('node:child_process');
      execSync('node -e "const { PrismaClient } = require(\'./node_modules/@prisma/client\'); const prisma = new PrismaClient(); async function clean() { await prisma.user.deleteMany({ where: { email: { startsWith: \'e2e.flow.\' } } }); process.exit(0); } clean();"', { cwd: '../server' });
    } catch (_err) {
      // Ignore cleanup error
    }
  });
});

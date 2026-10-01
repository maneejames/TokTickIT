import { test, expect } from '@playwright/test';

test.describe('Administrator User Management E2E Tests', () => {
  test('ADMIN-E2E-01: Full user administration lifecycle (create, search, edit)', async ({ page }) => {
    // 1. Navigate to root and log in as Administrator
    await page.goto('/');
    await page.fill('#login-email', 'admin@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Verify landing on User Management
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

    // 5. Submit user creation
    await page.click('button:has-text("Create User")');

    // 6. Verify user appears in table
    await expect(page.locator('body')).toContainText(createdUserEmail);

    // 7. Search filter test
    await page.fill('#user-search', 'E2E Flow');
    await expect(page.locator('body')).toContainText(createdUserEmail);

    // 8. Open Edit modal for the created user
    const editBtn = page.locator(`tr:has-text("${createdUserEmail}") button:has-text("Edit")`).first();
    await editBtn.click();
    await expect(page.locator('body')).toContainText(/Edit User/i);

    // 9. Update user name
    await page.fill('#edit-name', 'E2E Flow User Updated');
    await page.click('button:has-text("Save Changes")');

    // 10. Verify updated name persists
    await expect(page.locator('body')).toContainText('E2E Flow User Updated');
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


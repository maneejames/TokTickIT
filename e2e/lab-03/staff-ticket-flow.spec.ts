import { test, expect } from '@playwright/test';

test.describe('IT Staff Ticket Flow E2E Tests', () => {
  test('STAFF-E2E-01: IT Staff ticket queue, open detail, post internal note and public comment', async ({ page }) => {
    // 1. Navigate to root and log in as IT Staff
    await page.goto('/');
    await page.fill('#login-email', 'staff.witchai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Verify landing on Staff Ticket Queue
    await expect(page.locator('body')).toContainText(/IT Support Ticket Queue/i);

    // 3. Open first ticket in the queue
    const openBtn = page.getByRole('button', { name: /open ticket/i }).first();
    await openBtn.click();

    // 4. Verify landing on Staff Ticket Detail view
    await expect(page.locator('body')).toContainText(/Back to Queue/i);
    await expect(page.locator('body')).toContainText(/Ticket Ownership/i);

    // 5. Post an Internal Note (private to IT staff)
    const noteText = `E2E automated internal note ${Date.now()}`;
    await page.fill('#staff-note-input', noteText);
    await page.click('button:has-text("Add Internal Note")');

    // 6. Verify internal note appears in the internal notes thread
    await expect(page.locator('body')).toContainText(noteText);

    // 7. Post a Public Comment
    const commentText = `E2E automated public comment ${Date.now()}`;
    await page.fill('#staff-comment-input', commentText);
    await page.click('button:has-text("Post Public Comment")');

    // 8. Verify public comment appears in the public comments thread
    await expect(page.locator('body')).toContainText(commentText);
  });

  test.afterAll(async () => {
    try {
      const { execSync } = await import('node:child_process');
      execSync('node -e "const { PrismaClient } = require(\'./node_modules/@prisma/client\'); const prisma = new PrismaClient(); async function clean() { await prisma.publicComment.deleteMany({ where: { content: { contains: \'E2E automated\' } } }); await prisma.internalNote.deleteMany({ where: { content: { contains: \'E2E automated\' } } }); process.exit(0); } clean();"', { cwd: '../server' });
    } catch (_err) {
      // Ignore cleanup error
    }
  });
});


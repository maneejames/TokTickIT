import { test, expect } from '@playwright/test';

test.describe('E2E-02: Ticket Resolution Gate and Workflow Transitions', () => {
  test('Requester resolution indicator and staff workflow gate', async ({ page }) => {
    // 1. Log in as Requester
    await page.goto('/');
    await page.fill('#login-email', 'somchai.jai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('body')).toContainText(/Welcome, Somchai/i);

    // 2. Open My Tickets from dashboard button or nav
    const viewMyTicketsBtn = page.getByRole('button', { name: /view my tickets/i });
    if (await viewMyTicketsBtn.isVisible()) {
      await viewMyTicketsBtn.click();
    } else {
      await page.locator('nav').getByRole('button', { name: /my tickets/i }).click();
    }
    await expect(page.locator('body')).toContainText(/My Tickets/i);

    // 3. Open first ticket detail
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 10000 });
    await firstRow.click();
    await expect(page.locator('body')).toContainText(/Ticket Details|Actions Taken/i);

    // 4. Locate resolution checkbox if available
    const resCheckbox = page.locator('#problemResolvedCheckbox');
    if (await resCheckbox.isVisible()) {
      const isChecked = await resCheckbox.isChecked();
      if (!isChecked) {
        await resCheckbox.check();
      }
      await expect(page.locator('body')).toContainText(/Mark as: Problem Appears Resolved/i);
    }

    // 5. Logout Requester
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page.locator('#login-email')).toBeVisible();

    // 6. Log in as IT Staff
    await page.fill('#login-email', 'staff.witchai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 7. Verify staff lands on detail or queue overview
    await expect(page.locator('body')).toContainText(/Back to Queue|Ticket Ownership|IT Service Desk Operations/i);

    // If on queue overview, open ticket
    const openBtn = page.getByRole('button', { name: /open ticket/i }).first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
    }
    await expect(page.locator('body')).toContainText(/Ticket Ownership|Mark as Open|Start Progress/i);
  });
});

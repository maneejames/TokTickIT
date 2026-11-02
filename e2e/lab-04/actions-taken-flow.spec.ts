import { test, expect } from '@playwright/test';

test.describe('E2E-01: Actions Taken Lifecycle Flow', () => {
  const uniqueActionDesc = `Hardware inspected and fan replaced ${Date.now()}`;
  const uniqueFollowUp = `Check temperatures in 48 hours ${Date.now()}`;

  test('Staff adds action with follow-up, Requester views as read-only', async ({ page }) => {
    // 1. Staff logs in
    await page.goto('/');
    await page.fill('#login-email', 'staff.witchai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Open Ticket Queue from header or dashboard
    await expect(page.locator('body')).toContainText(/IT Service Desk Operations|Welcome back/i);
    const queueNav = page.locator('nav span[role="button"]:has-text("Ticket Queue")');
    if (await queueNav.isVisible()) {
      await queueNav.click();
    } else {
      await page.getByRole('button', { name: /open queue/i }).first().click();
    }
    await expect(page.locator('body')).toContainText(/IT Support Ticket Queue/i);

    // 3. Open first ticket in queue
    const openBtn = page.getByRole('button', { name: /open ticket/i }).first();
    await openBtn.click();
    await expect(page.locator('body')).toContainText(/Ticket Ownership|Actions Taken/i);

    // 4. Click Add Action
    const addActionBtn = page.getByRole('button', { name: /add action/i });
    await addActionBtn.click();
    await expect(page.locator('body')).toContainText(/Record New Action Taken/i);

    // 5. Fill action form with follow-up
    await page.fill('#action-description', uniqueActionDesc);
    await page.fill('#action-result', 'Replaced noisy cooling fan and verified rpm');
    const followUpCheckbox = page.getByLabel(/follow-up required\?/i);
    await followUpCheckbox.check();
    await page.fill('#action-followup-note', uniqueFollowUp);

    // 6. Submit Action
    await page.getByRole('button', { name: /save action/i }).click();

    // 7. Verify action appears in the table with planned status and follow-up note
    await expect(page.locator('body')).toContainText(uniqueActionDesc);
    await expect(page.locator('body')).toContainText(uniqueFollowUp);

    // 8. Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page.locator('#login-email')).toBeVisible();

    // 9. Log in as Requester (Somchai)
    await page.fill('#login-email', 'somchai.jai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 10. Navigate to My Tickets and open first ticket
    const myTicketsNav = page.locator('nav span[role="button"]:has-text("My Tickets")');
    if (await myTicketsNav.isVisible()) {
      await myTicketsNav.click();
    }
    await expect(page.locator('body')).toContainText(/My Tickets/i);
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // 11. Verify Requester view has NO Add Action button
    await expect(page.locator('body')).toContainText(/Actions Taken/i);
    await expect(page.getByRole('button', { name: /add action/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /save action/i })).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';

test.describe('E2E-03: Dashboards and Drill-Down Filtering', () => {
  test('Requester dashboard metrics and drill-down link', async ({ page }) => {
    // 1. Log in as Requester
    await page.goto('/');
    await page.fill('#login-email', 'somchai.jai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Verify Requester Dashboard is visible
    await expect(page.locator('body')).toContainText(/Welcome, Somchai|Quick overview/i);

    // 3. Click first active drill-down card link or View My Tickets button
    const drillDownLink = page.locator('a[role="link"]:has-text("View →")').first();
    if (await drillDownLink.isVisible()) {
      await drillDownLink.click();
    } else {
      await page.getByRole('button', { name: /view my tickets/i }).click();
    }
    await expect(page.locator('body')).toContainText(/My Tickets/i);

    // 4. Logout
    await page.getByRole('button', { name: /logout/i }).click();
  });

  test('Staff dashboard metrics and drill-down link', async ({ page }) => {
    // 1. Log in as IT Staff
    await page.goto('/');
    await page.fill('#login-email', 'staff.witchai@kmutt.ac.th');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Verify Staff Dashboard is visible
    await expect(page.locator('body')).toContainText(/IT Service Desk Operations|Welcome back/i);

    // 3. Click an active card drilldown link or Open Queue
    const staffCardLink = page.locator('a[role="link"]:has-text("View →")').first();
    if (await staffCardLink.isVisible()) {
      await staffCardLink.click();
    } else {
      await page.getByRole('button', { name: /open queue/i }).first().click();
    }
    await expect(page.locator('body')).toContainText(/IT Support Ticket Queue/i);
  });
});

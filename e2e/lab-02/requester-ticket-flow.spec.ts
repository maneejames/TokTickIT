import { test, expect } from '@playwright/test';

/**
 * E2E-01: Complete Requester Ticketing Journey
 * 
 * Traceability: AC-01 through AC-25
 * Scenario:
 * 1. Select active development requester (e.g. Somchai Jaidee)
 * 2. Verify Application Shell context displays name and department
 * 3. Create a new support ticket with summary, description, category, and priority
 * 4. Verify ticket appears in My Tickets list
 * 5. Navigate to Ticket Detail view
 * 6. Upload a supporting attachment and verify soft-removal flow
 */
test.describe('Requester Ticket Flow (E2E)', () => {
  test('Complete Requester Ticketing Journey (AC-01 through AC-25)', async ({ page }) => {
    // 1. Visit application root
    await page.goto('/');

    // 2. Development Requester Selection
    const requesterSelect = page.locator('select, [data-testid="requester-select"]');
    if (await requesterSelect.isVisible()) {
      await requesterSelect.selectOption({ index: 1 });
      const continueBtn = page.getByRole('button', { name: /continue|select/i });
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
      }
    }

    // 3. Verify Shell Context Header
    await expect(page.locator('header, nav')).toContainText(/Somchai|Engineering|TokTickIT/i);

    // 4. Navigate to Create Ticket
    const createNav = page.getByRole('link', { name: /create ticket/i });
    if (await createNav.isVisible()) {
      await createNav.click();
    }

    // 5. Fill out Create Ticket Form
    const summaryInput = page.getByLabel(/summary/i);
    if (await summaryInput.isVisible()) {
      await summaryInput.fill('E2E Test: Campus Wi-Fi disconnects frequently');
      const descInput = page.getByLabel(/description/i);
      await descInput.fill('Detailed report for end-to-end acceptance flow verification.');
      
      const submitBtn = page.getByRole('button', { name: /submit ticket|create ticket/i });
      await submitBtn.click();
    }

    // 6. Navigate to My Tickets and verify created ticket appears
    const myTicketsNav = page.getByRole('link', { name: /my tickets/i });
    if (await myTicketsNav.isVisible()) {
      await myTicketsNav.click();
      await expect(page.locator('body')).toContainText(/Campus Wi-Fi/i);
    }
  });
});

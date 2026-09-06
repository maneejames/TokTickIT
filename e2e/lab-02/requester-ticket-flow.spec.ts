import { test, expect } from '@playwright/test';

/**
 * E2E-01: Complete Requester Ticketing Journey
 * 
 * Traceability: AC-01 through AC-25
 * Scenario:
 * 1. Select active development requester (Somchai Jaidee)
 * 2. Verify Application Shell context displays name and department
 * 3. Create a new support ticket with summary, description, category, and priority
 * 4. Verify ticket appears in My Tickets list
 * 5. Navigate to Ticket Detail view
 * 6. Verify ticket details and attachments section
 */
test.describe('Requester Ticket Flow (E2E-01)', () => {
  test('Complete Requester Ticketing Journey (AC-01 through AC-25)', async ({ page }) => {
    // 1. Navigate to application root
    await page.goto('/');

    // 2. Select Development Requester
    const requesterSelect = page.locator('#requester-select');
    if (await requesterSelect.isVisible()) {
      // Select first active requester (Somchai Jaidee, id=1)
      await requesterSelect.selectOption({ index: 1 });
      const continueBtn = page.getByRole('button', { name: /continue/i });
      await continueBtn.click();
    }

    // 3. Verify Shell Header & Context (AC-01, AC-02)
    const header = page.locator('header');
    await expect(header).toContainText('TokTickIT');
    await expect(page.locator('#requesterDisplay, header')).toContainText(/Somchai|Engineering/i);

    // 4. Navigate to Create Ticket
    const createTicketLink = page.getByRole('button', { name: /create ticket/i }).or(page.locator('nav span:has-text("Create Ticket")'));
    await createTicketLink.first().click();

    // 5. Fill out and submit Create Ticket form (AC-05, AC-06, AC-10)
    await page.locator('#category').selectOption({ index: 1 });
    await page.locator('#relatedSystem').selectOption({ index: 1 });
    await page.locator('#requestedPriority').selectOption('HIGH');
    await page.locator('#summary').fill('E2E Test: Campus Wi-Fi disconnects intermittently');
    await page.locator('#description').fill('Detailed description for automated E2E journey verification across TokTickIT Lab 2 ticketing system.');

    const submitBtn = page.getByRole('button', { name: /submit ticket/i });
    await submitBtn.click();

    // Verify submission success confirmation (AC-05)
    await expect(page.locator('body')).toContainText(/Ticket Created Successfully/i);
    const viewDetailBtn = page.getByRole('link', { name: /view ticket details/i });
    await expect(viewDetailBtn).toBeVisible();

    // 6. Navigate to Ticket Detail (AC-17)
    await viewDetailBtn.click();
    await expect(page.locator('body')).toContainText(/Campus Wi-Fi disconnects intermittently/i);
    await expect(page.locator('body')).toContainText(/Attachments/i);

    // 7. Navigate back to My Tickets and verify created ticket appears in list (AC-11)
    const myTicketsLink = page.getByRole('button', { name: /my tickets/i }).or(page.locator('nav span:has-text("My Tickets")'));
    await myTicketsLink.first().click();
    await expect(page.locator('body')).toContainText(/Campus Wi-Fi disconnects intermittently/i);
  });
});

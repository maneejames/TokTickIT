import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

const BASE_URL = "http://localhost:5173";
const ARTIFACTS_DIR = path.resolve("../artifacts/lab-03/screenshots");

async function run() {
  const browser = await chromium.launch();
  const report = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // Helper to check horizontal overflow
    async function checkOverflow(screenName) {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      const hasOverflow = scrollWidth > innerWidth + 1; // 1px tolerance
      if (hasOverflow) {
        console.warn(`[OVERFLOW] ${screenName} (${vp.name}): scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
        report.push({ screen: screenName, viewport: vp.name, issue: `Horizontal overflow (${scrollWidth}px > ${innerWidth}px)` });
      }
    }

    // 1. Screen: Login
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("networkidle");
    const loginDir = path.join(ARTIFACTS_DIR, "authentication");
    fs.mkdirSync(loginDir, { recursive: true });
    await page.screenshot({ path: path.join(loginDir, `login-${vp.name}.png`), fullPage: true });
    await checkOverflow("Login");

    // 2. Screen: Change Password (using temp.req@kmutt.ac.th)
    await page.fill('input[type="email"], #email', 'temp.req@kmutt.ac.th');
    await page.fill('input[type="password"], #password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(loginDir, `change-password-${vp.name}.png`), fullPage: true });
    await checkOverflow("Change Password");

    // Clear session / cookies
    await context.clearCookies();

    // 3. Screen: Requester - My Tickets (somchai.jai@kmutt.ac.th)
    await page.goto(`${BASE_URL}/`);
    await page.fill('input[type="email"], #email', 'somchai.jai@kmutt.ac.th');
    await page.fill('input[type="password"], #password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const reqDir = path.join(ARTIFACTS_DIR, "requester");
    fs.mkdirSync(reqDir, { recursive: true });
    await page.screenshot({ path: path.join(reqDir, `my-tickets-${vp.name}.png`), fullPage: true });
    await checkOverflow("My Tickets");

    // 4. Screen: Requester - Create Ticket
    // Look for button or navigation to Create Ticket
    const createBtn = page.locator('button:has-text("Create Ticket"), nav button:has-text("Create"), a:has-text("Create Ticket")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(reqDir, `create-ticket-${vp.name}.png`), fullPage: true });
      await checkOverflow("Create Ticket");
    }

    // 5. Screen: Requester - Ticket Detail
    const viewDetailBtn = page.locator('a[href^="/tickets/"], tr td a, button:has-text("View")').first();
    const reqDetailDir = path.join(ARTIFACTS_DIR, "requester");
    fs.mkdirSync(reqDetailDir, { recursive: true });
    if (await viewDetailBtn.isVisible()) {
      await viewDetailBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(reqDetailDir, `requester-ticket-detail-${vp.name}.png`), fullPage: true });
      await checkOverflow("Requester Ticket Detail");
    }

    // Clear session
    await context.clearCookies();

    // 6. Screen: IT Staff - Queue (staff.witchai@kmutt.ac.th)
    await page.goto(`${BASE_URL}/`);
    await page.fill('input[type="email"], #email', 'staff.witchai@kmutt.ac.th');
    await page.fill('input[type="password"], #password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const staffQueueDir = path.join(ARTIFACTS_DIR, "staff-queue");
    fs.mkdirSync(staffQueueDir, { recursive: true });
    await page.screenshot({ path: path.join(staffQueueDir, `queue-${vp.name}.png`), fullPage: true });
    await checkOverflow("Staff Ticket Queue");

    // 7. Screen: IT Staff - Ticket Detail
    const openTicketBtn = page.locator('button:has-text("Open Ticket"), span[role="button"]:has-text("TICK-"), span:has-text("TICK-")').first();
    const staffDetailDir = path.join(ARTIFACTS_DIR, "staff-ticket-detail");
    fs.mkdirSync(staffDetailDir, { recursive: true });
    if (await openTicketBtn.isVisible()) {
      await openTicketBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(staffDetailDir, `staff-ticket-detail-${vp.name}.png`), fullPage: true });
      await checkOverflow("Staff Ticket Detail");
    }

    // Clear session
    await context.clearCookies();

    // 8. Screen: Administrator - User Management (admin@kmutt.ac.th)
    await page.goto(`${BASE_URL}/`);
    await page.fill('input[type="email"], #email', 'admin@kmutt.ac.th');
    await page.fill('input[type="password"], #password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const userMgmtDir = path.join(ARTIFACTS_DIR, "user-management");
    fs.mkdirSync(userMgmtDir, { recursive: true });
    await page.screenshot({ path: path.join(userMgmtDir, `user-management-${vp.name}.png`), fullPage: true });
    await checkOverflow("Admin User Management");

    // Also open Edit User Modal for admin screenshot
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(userMgmtDir, `edit-user-modal-${vp.name}.png`), fullPage: true });
    }

    await context.close();
  }

  await browser.close();
  console.log("\nScreenshot capture complete.");
  console.log("Visual / overflow findings:", JSON.stringify(report, null, 2));
}

run().catch(err => {
  console.error("Error in capture script:", err);
  process.exit(1);
});

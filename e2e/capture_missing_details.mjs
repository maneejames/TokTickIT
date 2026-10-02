import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

const BASE_URL = "http://localhost:5173";
const ARTIFACTS_DIR = path.resolve("../artifacts/lab-03/screenshots");

async function run() {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Capturing missing detail views for: ${vp.name} (${vp.width}x${vp.height}) ===`);

    // 1. Requester Ticket Detail
    const reqContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const reqPage = await reqContext.newPage();
    await reqPage.goto(`${BASE_URL}/`);
    await reqPage.fill('#login-email', 'somchai.jai@kmutt.ac.th');
    await reqPage.fill('#login-password', 'Password123!');
    await reqPage.click('button[type="submit"]');
    await reqPage.waitForTimeout(1500);

    // Click first visible ticket
    const ticketLink = reqPage.locator('a[href^="/tickets/"]:visible, [data-testid="tickets-mobile-cards"] a:visible, .zen-card[style*="pointer"]:visible').first();
    await ticketLink.waitFor({ state: "visible", timeout: 8000 });
    await ticketLink.click();
    await reqPage.waitForTimeout(1500);

    const reqDir = path.join(ARTIFACTS_DIR, "requester");
    fs.mkdirSync(reqDir, { recursive: true });
    const reqPath = path.join(reqDir, `requester-ticket-detail-${vp.name}.png`);
    await reqPage.screenshot({ path: reqPath, fullPage: true });
    console.log(`Saved: ${reqPath}`);
    await reqContext.close();

    // 2. Staff Ticket Detail
    const staffContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const staffPage = await staffContext.newPage();
    await staffPage.goto(`${BASE_URL}/`);
    await staffPage.fill('#login-email', 'staff.witchai@kmutt.ac.th');
    await staffPage.fill('#login-password', 'Password123!');
    await staffPage.click('button[type="submit"]');
    await staffPage.waitForTimeout(1500);

    // Click first visible ticket link or open button
    const staffOpen = staffPage.locator('span[role="button"]:has-text("TICK-"):visible, button:has-text("Open Ticket"):visible, [data-testid="staff-queue-mobile-cards"] span:visible').first();
    await staffOpen.waitFor({ state: "visible", timeout: 8000 });
    await staffOpen.click();
    await staffPage.waitForTimeout(1500);

    const staffDir = path.join(ARTIFACTS_DIR, "staff-ticket-detail");
    fs.mkdirSync(staffDir, { recursive: true });
    const staffPath = path.join(staffDir, `staff-ticket-detail-${vp.name}.png`);
    await staffPage.screenshot({ path: staffPath, fullPage: true });
    console.log(`Saved: ${staffPath}`);
    await staffContext.close();
  }

  await browser.close();
  console.log("\nCapture of missing detail screenshots complete.");
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

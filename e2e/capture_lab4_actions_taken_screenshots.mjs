import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

const PORT = 5182;
const CLIENT_DIST = path.resolve(__dirname, "../client/dist");
const SCREENSHOT_DIR = path.resolve(__dirname, "../artifacts/lab-04/screenshots/actions-taken");

// Simple static file server for client/dist
function startServer() {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".json": "application/json",
  };

  const server = http.createServer((req, res) => {
    let cleanUrl = req.url.split("?")[0].replace(/^\/+/, "");
    let filePath = path.join(CLIENT_DIST, cleanUrl);
    if (!cleanUrl || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(CLIENT_DIST, "index.html");
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading file");
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      resolve(server);
    });
  });
}

const mockStaffUser = {
  id: 2,
  username: "witchai",
  name: "Witchai Tech",
  email: "staff.witchai@kmutt.ac.th",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 1,
  username: "somchai",
  name: "Somchai Requester",
  email: "somchai@kmutt.ac.th",
  role: "REQUESTER",
  mustChangePassword: false,
};

const mockTicket = {
  id: 101,
  ticketNumber: "TICK-20261030-0001",
  requesterId: 1,
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Workstation power adapter failing under load",
  description: "Workstation shuts down whenever high GPU rendering starts. Smell of ozone from brick.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  isRequesterResolved: false,
  ownerId: 2,
  owner: mockStaffUser,
  createdAt: "2026-10-30T09:00:00.000Z",
  updatedAt: "2026-10-30T10:00:00.000Z",
  requester: {
    id: 1,
    name: "Somchai Requester",
    email: "somchai@kmutt.ac.th",
    department: "Computer Engineering",
  },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Workstation Support" },
  attachments: [],
  publicComments: [],
  version: 0,
};

const mockActionsList = [
  {
    id: 201,
    ticketId: 101,
    description: "Inspected physical power adapter and verified voltage under load tester.",
    performedById: 2,
    performedBy: {
      id: 2,
      username: "witchai",
      firstName: "Witchai",
      lastName: "Tech",
      role: "IT_STAFF",
    },
    actionDate: "2026-10-30T10:00:00.000Z",
    result: "Output drops from 19.5V to 11.2V at 4A draw.",
    status: "COMPLETED",
    completedAt: "2026-10-30T10:30:00.000Z",
    followUpRequired: true,
    followUpNote: "Order replacement 230W power supply from approved vendor list.",
    assignedToId: 3,
    assignedTo: {
      id: 3,
      username: "kamon",
      firstName: "Kamon",
      lastName: "Support",
      role: "IT_STAFF",
    },
    attachmentNotes: "Photo of diagnostic reading attached in Attachments tab.",
    clientRequestId: "req-001",
    version: 1,
    createdAt: "2026-10-30T10:00:00.000Z",
    updatedAt: "2026-10-30T10:30:00.000Z",
  },
  {
    id: 202,
    ticketId: 101,
    description: "Deploy temporary spare 180W power supply while waiting for 230W stock.",
    performedById: 3,
    performedBy: {
      id: 3,
      username: "kamon",
      firstName: "Kamon",
      lastName: "Support",
      role: "IT_STAFF",
    },
    actionDate: "2026-10-30T11:15:00.000Z",
    result: "System booted and stable during standard desktop workload.",
    status: "PLANNED",
    completedAt: null,
    followUpRequired: false,
    followUpNote: null,
    assignedToId: 3,
    assignedTo: {
      id: 3,
      username: "kamon",
      firstName: "Kamon",
      lastName: "Support",
      role: "IT_STAFF",
    },
    attachmentNotes: null,
    clientRequestId: "req-002",
    version: 0,
    createdAt: "2026-10-30T11:15:00.000Z",
    updatedAt: "2026-10-30T11:15:00.000Z",
  },
];

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const server = await startServer();
  console.log(`Static server running at http://localhost:${PORT}`);

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\nCapturing screenshots for ${vp.name} (${vp.width}x${vp.height})...`);

    // Helper to mock routes
    async function setupMockRoutes(page, currentUser) {
      await page.route("**/api/auth/me", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: currentUser }),
        });
      });

      await page.route(`**/api/tickets/101`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockTicket),
        });
      });

      await page.route(`**/api/tickets/101/actions`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: mockActionsList }),
        });
      });

      await page.route(`**/api/tickets/101/notes`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.route(`**/api/tickets/101/internal-notes`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.route(`**/api/staff/users**`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            mockStaffUser,
            { id: 3, name: "Kamon Support", email: "staff.kamon@kmutt.ac.th", role: "IT_STAFF", isActive: true },
          ]),
        });
      });

      await page.route(`**/api/admin/users**`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            mockStaffUser,
            { id: 3, name: "Kamon Support", email: "staff.kamon@kmutt.ac.th", role: "IT_STAFF", isActive: true },
          ]),
        });
      });
    }

    // 1. Scenario: Actions list with multiple actions by different users (Staff view)
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await setupMockRoutes(page, mockStaffUser);

      await page.goto(`http://localhost:${PORT}/staff/tickets/101`);
      await page.waitForSelector('.actions-taken-container');
      await page.waitForTimeout(500);

      const target = await page.$('.actions-taken-container');
      if (target) {
        await target.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-list-${vp.name}.png`),
        });
      } else {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-list-${vp.name}.png`),
          fullPage: true,
        });
      }
      await context.close();
    }

    // 2. Scenario: Create form with follow-up validation error
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await setupMockRoutes(page, mockStaffUser);

      await page.goto(`http://localhost:${PORT}/staff/tickets/101`);
      await page.waitForSelector('.actions-taken-container');

      // Click Add Action
      await page.click('button:has-text("Add Action")');
      await page.waitForSelector('.add-action-panel');

      // Fill valid description & result
      await page.fill('#action-description', 'Measured operating temperature of replacement adapter');
      await page.fill('#action-result', 'Temperature peaked at 74 degrees Celsius after 30 minutes');

      // Toggle Follow-up required = Yes
      await page.click('input[type="checkbox"]');
      await page.waitForSelector('#action-followup-note');

      // Click Save Action without entering follow-up note to trigger validation error
      await page.click('button:has-text("Save Action")');
      await page.waitForSelector('text=Follow-up note is required');
      await page.waitForTimeout(300);

      const target = await page.$('.add-action-panel');
      if (target) {
        await target.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-create-validation-error-${vp.name}.png`),
        });
      } else {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-create-validation-error-${vp.name}.png`),
          fullPage: true,
        });
      }
      await context.close();
    }

    // 3. Scenario: 409 Conflict message
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await setupMockRoutes(page, mockStaffUser);

      // Route PATCH status to return 409
      await page.route(`**/api/tickets/101/actions/202/status`, (route) => {
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "CONFLICT",
              message: "This action was changed by someone else. Reload to see the latest version.",
            },
          }),
        });
      });

      await page.goto(`http://localhost:${PORT}/staff/tickets/101`);
      await page.waitForSelector('.actions-taken-container');

      // Click Complete on planned row
      await page.click('button[name="complete"]');
      await page.waitForSelector('text=Reload');
      await page.waitForTimeout(300);

      const target = await page.$('.actions-taken-container');
      if (target) {
        await target.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-409-conflict-${vp.name}.png`),
        });
      } else {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-409-conflict-${vp.name}.png`),
          fullPage: true,
        });
      }
      await context.close();
    }

    // 4. Scenario: Requester read-only view
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await setupMockRoutes(page, mockRequesterUser);

      await page.goto(`http://localhost:${PORT}/tickets/101`);
      await page.waitForSelector('.actions-taken-container');
      await page.waitForTimeout(500);

      const target = await page.$('[data-testid="requester-actions-taken-section"]');
      if (target) {
        await target.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-requester-readonly-${vp.name}.png`),
        });
      } else {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `actions-requester-readonly-${vp.name}.png`),
          fullPage: true,
        });
      }
      await context.close();
    }
  }

  await browser.close();
  server.close();
  console.log("\nAll screenshots captured successfully into:", SCREENSHOT_DIR);
}

run().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});

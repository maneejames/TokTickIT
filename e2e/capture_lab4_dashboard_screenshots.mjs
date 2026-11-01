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
  { name: "mobile", width: 375, height: 812 },
];

const PORT = 5183;
const CLIENT_DIST = path.resolve(__dirname, "../client/dist");
const STAFF_SCREENSHOT_DIR = path.resolve(__dirname, "../artifacts/lab-04/screenshots/staff-dashboard");
const REQUESTER_SCREENSHOT_DIR = path.resolve(__dirname, "../artifacts/lab-04/screenshots/requester-dashboard");

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

const mockStaffPopulatedUser = {
  id: 7,
  username: "staff.witchai",
  name: "Witchai Staff",
  email: "staff.witchai@kmutt.ac.th",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockStaffZeroUser = {
  id: 9,
  username: "staff.naree",
  name: "Naree Staff",
  email: "staff.naree@kmutt.ac.th",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockRequesterPopulatedUser = {
  id: 1,
  username: "somchai.jai",
  name: "Somchai Jaidee",
  email: "somchai.jai@kmutt.ac.th",
  role: "REQUESTER",
  mustChangePassword: false,
};

const mockRequesterZeroUser = {
  id: 13,
  username: "wichai.mee",
  name: "Wichai Meesook",
  email: "wichai.mee@kmutt.ac.th",
  role: "REQUESTER",
  mustChangePassword: false,
};

const staffPopulatedDashboard = {
  generatedAt: new Date().toISOString(),
  metrics: {
    byStatus: {
      NEW: { count: 76, drillDown: { status: "NEW" } },
      OPEN: { count: 2, drillDown: { status: "OPEN" } },
      IN_PROGRESS: { count: 2, drillDown: { status: "IN_PROGRESS" } },
      WAITING_FOR_REQUESTER: { count: 1, drillDown: { status: "WAITING_FOR_REQUESTER" } },
      RESOLVED: { count: 1, drillDown: { status: "RESOLVED" } },
      CLOSED: { count: 1, drillDown: { status: "CLOSED" } },
      REOPENED: { count: 1, drillDown: { status: "REOPENED" } },
      CANCELLED: { count: 1, drillDown: { status: "CANCELLED" } },
    },
    unassigned: {
      count: 76,
      drillDown: { ownerId: "unassigned", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
    },
    myOwned: {
      count: 4,
      drillDown: { ownerId: 7, status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
    },
    byItPriority: {
      URGENT: { count: 3, drillDown: { priority: "URGENT", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      HIGH: { count: 3, drillDown: { priority: "HIGH", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      MEDIUM: { count: 72, drillDown: { priority: "MEDIUM", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      LOW: { count: 4, drillDown: { priority: "LOW", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
    },
    requesterResolvedPending: {
      count: 1,
      drillDown: { status: "OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", requesterResolved: true },
    },
    myFollowUps: { count: 2 },
  },
  urgentTickets: [
    {
      id: 101,
      ticketNumber: "TICK-20261030-0001",
      summary: "Server room AC unit power trip",
      itPriority: "URGENT",
      status: "OPEN",
      ownerName: "Witchai Staff",
      createdAt: "2026-10-30T08:00:00.000Z",
    },
  ],
  recentlyUpdated: [
    {
      id: 102,
      ticketNumber: "TICK-20261030-0002",
      summary: "VPN gateway unreachable for external staff",
      status: "IN_PROGRESS",
      updatedAt: "2026-10-31T09:30:00.000Z",
    },
  ],
  myRecentActions: [
    {
      id: 301,
      ticketId: 101,
      ticketNumber: "TICK-20261030-0001",
      descriptionPreview: "Reset the circuit breaker and switched to secondary cooling loop.",
      followUpRequired: true,
      actionDateTime: "2026-10-31T10:00:00.000Z",
    },
  ],
};

const staffZeroDashboard = {
  generatedAt: new Date().toISOString(),
  metrics: {
    byStatus: {
      NEW: { count: 0, drillDown: { status: "NEW" } },
      OPEN: { count: 0, drillDown: { status: "OPEN" } },
      IN_PROGRESS: { count: 0, drillDown: { status: "IN_PROGRESS" } },
      WAITING_FOR_REQUESTER: { count: 0, drillDown: { status: "WAITING_FOR_REQUESTER" } },
      RESOLVED: { count: 0, drillDown: { status: "RESOLVED" } },
      CLOSED: { count: 0, drillDown: { status: "CLOSED" } },
      REOPENED: { count: 0, drillDown: { status: "REOPENED" } },
      CANCELLED: { count: 0, drillDown: { status: "CANCELLED" } },
    },
    unassigned: {
      count: 0,
      drillDown: { ownerId: "unassigned", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
    },
    myOwned: {
      count: 0,
      drillDown: { ownerId: 9, status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
    },
    byItPriority: {
      URGENT: { count: 0, drillDown: { priority: "URGENT", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      HIGH: { count: 0, drillDown: { priority: "HIGH", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      MEDIUM: { count: 0, drillDown: { priority: "MEDIUM", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      LOW: { count: 0, drillDown: { priority: "LOW", status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
    },
    requesterResolvedPending: {
      count: 0,
      drillDown: { status: "OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", requesterResolved: true },
    },
    myFollowUps: { count: 0 },
  },
  urgentTickets: [],
  recentlyUpdated: [],
  myRecentActions: [],
};

const requesterPopulatedDashboard = {
  generatedAt: new Date().toISOString(),
  metrics: {
    activeTickets: {
      count: 58,
      drillDown: { status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
    },
    waitingForRequester: {
      count: 1,
      drillDown: { status: "WAITING_FOR_REQUESTER" },
    },
    resolved: {
      count: 1,
      drillDown: { status: "RESOLVED" },
    },
    closed: {
      count: 1,
      drillDown: { status: "CLOSED" },
    },
  },
  recentlyUpdated: [
    {
      id: 201,
      ticketNumber: "TICK-20261025-0001",
      summary: "Lab printer out of toner and paper tray jammed",
      status: "WAITING_FOR_REQUESTER",
      updatedAt: "2026-10-31T08:00:00.000Z",
    },
  ],
  recentlyResolved: [
    {
      id: 202,
      ticketNumber: "TICK-20261024-0002",
      summary: "Request access to Git repository for course CPE314",
      status: "RESOLVED",
      resolvedAt: "2026-10-30T14:00:00.000Z",
    },
  ],
};

const requesterZeroDashboard = {
  generatedAt: new Date().toISOString(),
  metrics: {
    activeTickets: {
      count: 0,
      drillDown: { status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
    },
    waitingForRequester: {
      count: 0,
      drillDown: { status: "WAITING_FOR_REQUESTER" },
    },
    resolved: {
      count: 0,
      drillDown: { status: "RESOLVED" },
    },
    closed: {
      count: 0,
      drillDown: { status: "CLOSED" },
    },
  },
  recentlyUpdated: [],
  recentlyResolved: [],
};

async function run() {
  fs.mkdirSync(STAFF_SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(REQUESTER_SCREENSHOT_DIR, { recursive: true });
  const server = await startServer();
  console.log(`Static server running at http://localhost:${PORT}`);

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    // 1. Staff Dashboard - Populated
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.route(/.*\/api\/auth\/me/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: mockStaffPopulatedUser }) });
      });
      await page.route(/.*\/api\/dashboard\/staff/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(staffPopulatedDashboard) });
      });

      await page.goto(`http://localhost:${PORT}/dashboard`);
      await page.waitForSelector('[data-testid="staff-dashboard"]');
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(STAFF_SCREENSHOT_DIR, `staff-dashboard-populated-${vp.name}.png`),
        fullPage: true,
      });
      await context.close();
    }

    // 2. Staff Dashboard - Zero
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.route(/.*\/api\/auth\/me/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: mockStaffZeroUser }) });
      });
      await page.route(/.*\/api\/dashboard\/staff/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(staffZeroDashboard) });
      });

      await page.goto(`http://localhost:${PORT}/dashboard`);
      await page.waitForSelector('[data-testid="staff-dashboard"]');
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(STAFF_SCREENSHOT_DIR, `staff-dashboard-zero-${vp.name}.png`),
        fullPage: true,
      });
      await context.close();
    }

    // 3. Requester Dashboard - Populated
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.route(/.*\/api\/auth\/me/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: mockRequesterPopulatedUser }) });
      });
      await page.route(/.*\/api\/dashboard\/requester/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(requesterPopulatedDashboard) });
      });

      await page.goto(`http://localhost:${PORT}/dashboard`);
      await page.waitForSelector('[data-testid="requester-dashboard"]');
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(REQUESTER_SCREENSHOT_DIR, `requester-dashboard-populated-${vp.name}.png`),
        fullPage: true,
      });
      await context.close();
    }

    // 4. Requester Dashboard - Zero
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.route(/.*\/api\/auth\/me/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: mockRequesterZeroUser }) });
      });
      await page.route(/.*\/api\/dashboard\/requester/, (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(requesterZeroDashboard) });
      });

      await page.goto(`http://localhost:${PORT}/dashboard`);
      await page.waitForSelector('[data-testid="requester-dashboard"]');
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(REQUESTER_SCREENSHOT_DIR, `requester-dashboard-zero-${vp.name}.png`),
        fullPage: true,
      });
      await context.close();
    }
  }

  await browser.close();
  server.close();
  console.log("Captured all 12 dashboard screenshots successfully!");
}

run().catch((err) => {
  console.error("Dashboard screenshot error:", err);
  process.exit(1);
});

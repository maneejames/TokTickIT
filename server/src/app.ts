import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Priority, Prisma, TicketStatus } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { requireRequester } from "./middleware/requesterAuth.js";
import { generateTicketNumber } from "./services/ticketNumber.js";

import {
  createSession,
  destroySession,
  requireAuth as requireAuthOld,
  extractSessionToken,
  validatePasswordComplexity,
  authenticateSession,
} from "./auth.js";
import bcrypt from "bcryptjs";

import {
  requireAuth,
  requireRequesterOnly,
  requireITStaffOnly,
  requireAuthAndTicketAccess,
  requireTicketOwnership,
  requireRequesterTicketAccess,
} from "./middleware/authorization.js";

export const app = express();

app.use(cors({
  credentials: true,
  origin: true,
}));
app.use(express.json());

// Global middleware to authenticate sessions and attach user to request
app.use(async (req, res, next) => {
  const user = await authenticateSession(req);
  if (user) {
    req.user = user;
  }
  next();
});

// ---------------------------------------------------------------------------
// Lab 3 Issue 4 — Authentication Endpoints
// ---------------------------------------------------------------------------

// POST /api/auth/login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });
  }

  try {
    const prisma = getPrisma();
    const user = await (prisma as any).user.findUnique({
      where: { email: email.trim() },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // Issue session
    const token = createSession(user.id);

    // Set cookie per api-spec.md §1.2 / §2.1: HttpOnly, SameSite=Lax, Path=/
    res.cookie("toktickit_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Login failed",
      },
    });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", requireAuth(), async (req: Request, res: Response) => {
  const token = extractSessionToken(req);
  if (token) {
    destroySession(token);
  }

  res.clearCookie("toktickit_session", {
    path: "/",
  });

  return res.status(200).json({
    message: "Successfully logged out",
  });
});

// GET /api/auth/me
app.get("/api/auth/me", requireAuth(), async (req: Request, res: Response) => {
  return res.status(200).json({
    user: {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
      mustChangePassword: req.user!.mustChangePassword,
    },
  });
});

// POST /api/auth/change-password
app.post("/api/auth/change-password", requireAuth(true), async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  const details: { field: string; message: string }[] = [];

  if (!currentPassword) {
    details.push({
      field: "currentPassword",
      message: "Current password is required",
    });
  }

  if (!newPassword) {
    details.push({
      field: "newPassword",
      message: "New password is required",
    });
  }

  if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    details.push({
      field: "confirmPassword",
      message: "Passwords do not match",
    });
  }

  if (newPassword && !validatePasswordComplexity(newPassword)) {
    details.push({
      field: "newPassword",
      message:
        "Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character",
    });
  }

  if (details.length > 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Password does not meet complexity requirements",
        details,
      },
    });
  }

  try {
    const prisma = getPrisma();
    const user = await (prisma as any).user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User not found",
        },
      });
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Current password is incorrect",
          details: [
            {
              field: "currentPassword",
              message: "Current password is incorrect",
            },
          ],
        },
      });
    }

    // Hash new password using bcrypt (work factor 10)
    const newHash = await bcrypt.hash(newPassword, 10);

    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // BR-26: Invalidate old session and issue rotated session token
    const oldToken = extractSessionToken(req);
    if (oldToken) {
      destroySession(oldToken);
    }

    const newToken = createSession(user.id);
    res.cookie("toktickit_session", newToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to change password",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Category list: GET /api/categories
// Returns only active categories (isActive: true)
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
    });
    res.status(200).json(categories);
  } catch (_err: unknown) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch categories",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Related Systems list: GET /api/related-systems
// Returns only active related systems (isActive: true)
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
    });
    res.status(200).json(systems);
  } catch (_err: unknown) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch related systems",
      },
    });
  }
});


// Reusable middleware verification endpoint
app.get("/api/requester-test-auth", requireRequester, (req: Request, res: Response) => {
  res.status(200).json({ ok: true, requester: req.requester });
});

// ---------------------------------------------------------------------------
// Lab 2 Issue 4 — Create Ticket: POST /api/tickets
// ---------------------------------------------------------------------------
app.post("/api/tickets", ...requireRequesterOnly(), async (req: Request, res: Response) => {
  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body ?? {};

  const details: { field: string; message: string }[] = [];

  // Summary validation: trimmed 5-100 characters
  const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
  if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 100) {
    details.push({
      field: "summary",
      message: "Summary must be between 5 and 100 characters",
    });
  }

  // Description validation: trimmed 10-2000 characters
  const trimmedDescription = typeof description === "string" ? description.trim() : "";
  if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
    details.push({
      field: "description",
      message: "Description must be between 10 and 2000 characters",
    });
  }

  // Category validation: required integer, must exist and be active
  const parsedCategoryId = Number(categoryId);
  let categoryExists = false;
  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    details.push({
      field: "categoryId",
      message: "Category is required and must be a valid ID",
    });
  } else {
    const cat = await getPrisma().category.findUnique({
      where: { id: parsedCategoryId },
    });
    if (cat && cat.isActive) {
      categoryExists = true;
    } else {
      details.push({
        field: "categoryId",
        message: "Category not found or inactive",
      });
    }
  }

  // Related system validation: required integer, must exist and be active
  const parsedSystemId = Number(relatedSystemId);
  let systemExists = false;
  if (!Number.isInteger(parsedSystemId) || parsedSystemId <= 0) {
    details.push({
      field: "relatedSystemId",
      message: "Related system is required and must be a valid ID",
    });
  } else {
    const sys = await getPrisma().relatedSystem.findUnique({
      where: { id: parsedSystemId },
    });
    if (sys && sys.isActive) {
      systemExists = true;
    } else {
      details.push({
        field: "relatedSystemId",
        message: "Related system not found or inactive",
      });
    }
  }

  // Priority validation: optional, defaults to MEDIUM, must be LOW, MEDIUM, or HIGH
  let priorityVal: Priority = Priority.MEDIUM;
  if (requestedPriority !== undefined && requestedPriority !== null && requestedPriority !== "") {
    if (Object.values(Priority).includes(requestedPriority as Priority)) {
      priorityVal = requestedPriority as Priority;
    } else {
      details.push({
        field: "requestedPriority",
        message: "Requested priority must be LOW, MEDIUM, or HIGH",
      });
    }
  }

  if (details.length > 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed on one or more fields",
        details,
      },
    });
  }

  try {
    const prisma = getPrisma();
    const createdTicket = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx);
      return tx.ticket.create({
        data: {
          ticketNumber,
          requesterId: req.user!.id, // Session-derived identity (BR-03, BR-07)
          categoryId: parsedCategoryId,
          relatedSystemId: parsedSystemId,
          summary: trimmedSummary,
          description: trimmedDescription,
          requestedPriority: priorityVal,
          currentStatus: "NEW",
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          relatedSystem: {
            select: { id: true, name: true },
          },
        },
      });
    });

    res.status(201).json({
      ...createdTicket,
      attachments: [],
    });
  } catch (_err: unknown) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create ticket",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Issue 4 — Attachment Upload: POST /api/tickets/:id/attachments
// ---------------------------------------------------------------------------
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

app.post(
  "/api/tickets/:id/attachments",
  ...requireRequesterTicketAccess(),
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: {
              code: "FILE_TOO_LARGE",
              message: "File exceeds 5 MB limit",
            },
          });
        }
        return res.status(400).json({
          error: {
            code: "UPLOAD_ERROR",
            message: err.message,
          },
        });
      }
      if (err) {
        return res.status(400).json({
          error: {
            code: "UPLOAD_ERROR",
            message: "Failed to upload file",
          },
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found",
        },
      });
    }

    const prisma = getPrisma();

    // 1. Ownership & ticket existence check
    // Per locked contract decision: return 404 Not Found (not 403) to prevent resource-existence enumeration
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found",
        },
      });
    }

    // 2. Active attachment count check (max 5 active per ticket)
    const activeCount = await prisma.attachment.count({
      where: {
        ticketId,
        isRemoved: false,
      },
    });

    if (activeCount >= 5) {
      return res.status(400).json({
        error: {
          code: "ATTACHMENT_LIMIT_EXCEEDED",
          message: "Maximum of 5 active attachments reached",
        },
      });
    }

    // 3. File presence check
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "No file provided for upload",
        },
      });
    }

    // 4. File MIME type check
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Unsupported file type. Only JPG, PNG, WEBP, and PDF are allowed",
        },
      });
    }

    // 5. Store file on disk under server/uploads/attachments/{uuid}.{ext}
    try {
      const ext = path.extname(file.originalname).toLowerCase() || getExtensionFromMime(file.mimetype);
      const uuid = crypto.randomUUID();
      const storedFilename = `${uuid}${ext}`;

      const uploadDir = path.resolve(process.cwd(), "uploads", "attachments");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, storedFilename);
      fs.writeFileSync(filePath, file.buffer);

      // 6. Record metadata in Attachment table
      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          storedFilename,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          isRemoved: false,
        },
        select: {
          id: true,
          ticketId: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          isRemoved: true,
          uploadedAt: true,
        },
      });

      res.status(201).json(attachment);
    } catch (_err: unknown) {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to save attachment",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 Issue 5 — My Tickets: GET /api/tickets
// ---------------------------------------------------------------------------
const ALLOWED_SORT_BY = ["createdAt", "requestedPriority", "status", "summary"] as const;
const ALLOWED_SORT_ORDER = ["asc", "desc"] as const;
const ALLOWED_PAGE_SIZES = [5, 10, 20, 50] as const;
type SortBy = (typeof ALLOWED_SORT_BY)[number];
type SortOrder = (typeof ALLOWED_SORT_ORDER)[number];

app.get("/api/tickets", ...requireRequesterOnly(), async (req: Request, res: Response) => {
  // ── Query parameter parsing & validation ─────────────────────────────────
  const validationErrors: { field: string; message: string }[] = [];

  // search (optional, default "")
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  // categoryId (optional, must be positive integer when present)
  let categoryIdFilter: number | undefined;
  if (req.query.categoryId !== undefined && req.query.categoryId !== "") {
    const parsed = Number(req.query.categoryId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      validationErrors.push({ field: "categoryId", message: "categoryId must be a positive integer" });
    } else {
      categoryIdFilter = parsed;
    }
  }

  // status (optional, must be a valid TicketStatus enum value when present, case-insensitive)
  const VALID_STATUSES = ["NEW"] as const;
  let statusFilter: string | undefined;
  if (req.query.status !== undefined && req.query.status !== "") {
    const normalizedStatus = String(req.query.status).trim().toUpperCase();
    if (!VALID_STATUSES.includes(normalizedStatus as "NEW")) {
      validationErrors.push({ field: "status", message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    } else {
      statusFilter = normalizedStatus;
    }
  }

  // priority / requestedPriority (optional, must be LOW, MEDIUM, or HIGH when present)
  const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
  const rawPriority = req.query.priority ?? req.query.requestedPriority;
  let priorityFilter: Priority | undefined;
  if (rawPriority !== undefined && rawPriority !== "") {
    if (!VALID_PRIORITIES.includes(rawPriority as any)) {
      validationErrors.push({
        field: "priority",
        message: `priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });
    } else {
      priorityFilter = rawPriority as Priority;
    }
  }

  // sortBy (optional, default "createdAt")
  let sortBy: SortBy = "createdAt";
  if (req.query.sortBy !== undefined && req.query.sortBy !== "") {
    if (!ALLOWED_SORT_BY.includes(req.query.sortBy as SortBy)) {
      validationErrors.push({
        field: "sortBy",
        message: `sortBy must be one of: ${ALLOWED_SORT_BY.join(", ")}`,
      });
    } else {
      sortBy = req.query.sortBy as SortBy;
    }
  }

  // sortOrder (optional, default "desc")
  let sortOrder: SortOrder = "desc";
  if (req.query.sortOrder !== undefined && req.query.sortOrder !== "") {
    if (!ALLOWED_SORT_ORDER.includes(req.query.sortOrder as SortOrder)) {
      validationErrors.push({ field: "sortOrder", message: "sortOrder must be 'asc' or 'desc'" });
    } else {
      sortOrder = req.query.sortOrder as SortOrder;
    }
  }

  // page (optional, default 1, must be >= 1)
  let page = 1;
  if (req.query.page !== undefined && req.query.page !== "") {
    const parsed = Number(req.query.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      validationErrors.push({ field: "page", message: "page must be a positive integer" });
    } else {
      page = parsed;
    }
  }

  // pageSize (optional, default 10, must be in [5, 10, 20, 50])
  let pageSize = 10;
  if (req.query.pageSize !== undefined && req.query.pageSize !== "") {
    const parsed = Number(req.query.pageSize);
    if (!ALLOWED_PAGE_SIZES.includes(parsed as (typeof ALLOWED_PAGE_SIZES)[number])) {
      validationErrors.push({
        field: "pageSize",
        message: `pageSize must be one of: ${ALLOWED_PAGE_SIZES.join(", ")}`,
      });
    } else {
      pageSize = parsed;
    }
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: validationErrors,
      },
    });
  }

  // ── Build Prisma where clause ─────────────────────────────────────────────
  const requesterId = req.user!.id; // Session-derived identity (BR-03, BR-07)

  const where: Prisma.TicketWhereInput = {
    requesterId, // strict ownership — never another requester's tickets
    ...(search && {
      OR: [
        { summary: { contains: search, mode: "insensitive" } },
        { ticketNumber: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(categoryIdFilter !== undefined && { categoryId: categoryIdFilter }),
    ...(statusFilter !== undefined && { currentStatus: statusFilter as "NEW" }),
    ...(priorityFilter !== undefined && { requestedPriority: priorityFilter }),
  };

  // ── Build orderBy ─────────────────────────────────────────────────────────
  // requestedPriority enum values sort alphabetically in Postgres (HIGH < LOW < MEDIUM)
  // which is incorrect for LOW < MEDIUM < HIGH. We use a raw query for that case.
  const useRawPrioritySort = sortBy === "requestedPriority";

  // Map the alias "status" → the actual field name "currentStatus"
  const fieldMap: Record<SortBy, string> = {
    createdAt: "createdAt",
    requestedPriority: "requestedPriority",
    status: "currentStatus",
    summary: "summary",
  };

  try {
    const prisma = getPrisma();
    const skip = (page - 1) * pageSize;

    if (useRawPrioritySort) {
      // Raw SQL for semantic priority order: LOW=1, MEDIUM=2, HIGH=3
      // We need both the filtered count and the paginated items.
      const priorityOrderSql =
        sortOrder === "asc"
          ? `CASE "requestedPriority" WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 ELSE 4 END ASC`
          : `CASE "requestedPriority" WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END ASC`;

      // Use Prisma findMany with orderBy workaround: fetch IDs in priority order via $queryRaw,
      // then fetch full data in that order using findMany.
      // This avoids duplicating the complex WHERE-to-raw-SQL mapping.

      // Step 1: get ordered IDs via raw SQL (only IDs + priority for sorting)
      const baseFilter = buildRawWhereClause(requesterId, search, categoryIdFilter, statusFilter, priorityFilter);

      const idRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM tickets ${baseFilter.sql} ORDER BY ${priorityOrderSql}, id ${sortOrder.toUpperCase()}`,
        ...baseFilter.params
      );

      const totalItems = idRows.length;
      const totalPages = Math.ceil(totalItems / pageSize) || 1;
      const pagedIds = idRows.slice(skip, skip + pageSize).map((r) => r.id);

      // Step 2: fetch full ticket data for paged IDs, preserve raw order
      type TicketItem = {
        id: number;
        requesterId: number;
        ticketNumber: string;
        summary: string;
        requestedPriority: Priority;
        currentStatus: TicketStatus;
        createdAt: Date;
        updatedAt: Date;
        category: { id: number; name: string };
        relatedSystem: { id: number; name: string };
        _count: { attachments: number };
      };
      const ticketsMap = new Map<number, TicketItem>();

      if (pagedIds.length > 0) {
        const tickets = await prisma.ticket.findMany({
          where: { id: { in: pagedIds } },
          select: {
            id: true,
            requesterId: true,
            ticketNumber: true,
            summary: true,
            requestedPriority: true,
            currentStatus: true,
            createdAt: true,
            updatedAt: true,
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
            _count: {
              select: {
                attachments: { where: { isRemoved: false } },
              },
            },
          },
        });
        for (const t of tickets) ticketsMap.set(t.id, t);
      }

      const items = pagedIds.map((id) => ticketsMap.get(id)).filter(Boolean);

      return res.status(200).json({
        items,
        pagination: { page, pageSize, totalItems, totalPages },
      });
    }

    // ── Standard Prisma orderBy (createdAt, summary, currentStatus) ──────────
    const orderByField = fieldMap[sortBy];
    const orderBy = { [orderByField]: sortOrder };

    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          requesterId: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          currentStatus: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          _count: {
            select: {
              attachments: { where: { isRemoved: false } },
            },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return res.status(200).json({
      items: tickets,
      pagination: { page, pageSize, totalItems, totalPages },
    });
  } catch (err: unknown) {
    console.error("GET /api/tickets error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch tickets",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Issue 6 — Requester Ticket Detail & Attachments
// ---------------------------------------------------------------------------

// GET /api/tickets/:id: Single ticket detail
app.get("/api/tickets/:id", ...requireAuthAndTicketAccess(), async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Ticket not found",
      },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        requesterId: true,
        categoryId: true,
        relatedSystemId: true,
        summary: true,
        description: true,
        requestedPriority: true,
        itPriority: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currentStatus: true,
        createdAt: true,
        updatedAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        relatedSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        isRequesterResolved: true,
        attachments: {
          orderBy: {
            uploadedAt: "asc",
          },
          select: {
            id: true,
            ticketId: true,
            originalFilename: true,
            mimeType: true,
            sizeBytes: true,
            isRemoved: true,
            removedAt: true,
            removedReason: true,
            uploadedAt: true,
          },
        },
        publicComments: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            ticketId: true,
            authorId: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!ticket || (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id)) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found",
        },
      });
    }

    return res.status(200).json({
      ...ticket,
      publicComments: ticket.publicComments.map((c) => ({
        id: c.id,
        ticketId: c.ticketId,
        authorId: c.authorId,
        authorName: c.author.name,
        authorRole: c.author.role,
        content: c.content,
        createdAt: c.createdAt,
      })),
      requester: {
        ...ticket.requester,
        department: "General",
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/tickets/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch ticket detail",
      },
    });
  }
});

// GET /api/tickets/:id/attachments/:attachmentId: Attachment metadata
app.get(
  "/api/tickets/:id/attachments/:attachmentId",
  ...requireAuthAndTicketAccess(),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    if (
      !Number.isInteger(ticketId) ||
      ticketId <= 0 ||
      !Number.isInteger(attachmentId) ||
      attachmentId <= 0
    ) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id)) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      const attachment = await prisma.attachment.findFirst({
        where: {
          id: attachmentId,
          ticketId,
        },
        select: {
          id: true,
          ticketId: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          isRemoved: true,
          removedAt: true,
          removedReason: true,
          uploadedAt: true,
        },
      });

      if (!attachment) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      return res.status(200).json(attachment);
    } catch (err: unknown) {
      console.error("GET attachment metadata error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch attachment metadata",
        },
      });
    }
  }
);

// GET /api/tickets/:id/attachments/:attachmentId/download: Stream active attachment
app.get(
  "/api/tickets/:id/attachments/:attachmentId/download",
  requireAuth(),
  requireTicketOwnership("id", "Attachment not found"),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    if (
      !Number.isInteger(ticketId) ||
      ticketId <= 0 ||
      !Number.isInteger(attachmentId) ||
      attachmentId <= 0
    ) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id)) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      const attachment = await prisma.attachment.findFirst({
        where: {
          id: attachmentId,
          ticketId,
        },
      });

      if (!attachment) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      // Check soft-removed: per locked contract, return 410 Gone (NOT 404)
      if (attachment.isRemoved) {
        return res.status(410).json({
          error: {
            code: "GONE",
            message: "This attachment has been removed and cannot be downloaded",
          },
        });
      }

      const uploadDir = path.resolve(process.cwd(), "uploads", "attachments");
      const filePath = path.join(uploadDir, attachment.storedFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "File not found on server",
          },
        });
      }

      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.originalFilename}"`
      );
      res.setHeader("Content-Length", attachment.sizeBytes);

      const stream = fs.createReadStream(filePath);
      stream.on("error", (_streamErr) => {
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              code: "INTERNAL_ERROR",
              message: "Failed to stream attachment file",
            },
          });
        }
      });
      stream.pipe(res);
    } catch (err: unknown) {
      console.error("Download attachment error:", err);
      if (!res.headersSent) {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to download attachment",
          },
        });
      }
    }
  }
);

// PATCH /api/tickets/:id/attachments/:attachmentId/remove: Soft-remove attachment
app.patch(
  "/api/tickets/:id/attachments/:attachmentId/remove",
  ...requireRequesterTicketAccess("id", "Attachment not found"),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    if (
      !Number.isInteger(ticketId) ||
      ticketId <= 0 ||
      !Number.isInteger(attachmentId) ||
      attachmentId <= 0
    ) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attachment not found",
        },
      });
    }

    const { removedReason } = req.body ?? {};
    if (removedReason !== undefined && removedReason !== null) {
      if (typeof removedReason !== "string" || removedReason.length > 200) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "removedReason must not exceed 200 characters",
          },
        });
      }
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket || (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id)) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      const attachment = await prisma.attachment.findFirst({
        where: {
          id: attachmentId,
          ticketId,
        },
      });

      if (!attachment) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      if (attachment.isRemoved) {
        return res.status(400).json({
          error: {
            code: "ALREADY_REMOVED",
            message: "Attachment is already removed",
          },
        });
      }

      const updated = await prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          isRemoved: true,
          removedAt: new Date(),
          removedReason: removedReason ? removedReason.trim() : null,
        },
        select: {
          id: true,
          isRemoved: true,
          removedAt: true,
          removedReason: true,
        },
      });

      return res.status(200).json(updated);
    } catch (err: unknown) {
      console.error("Remove attachment error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to remove attachment",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 — Problem Appears Resolved Indicator (Issue #6)
// ---------------------------------------------------------------------------

// PATCH /api/tickets/:id/resolve-indicator: Requester marks problem as resolved
app.patch(
  "/api/tickets/:id/resolve-indicator",
  ...requireRequesterTicketAccess("id", "Ticket not found"),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    const { isRequesterResolved } = req.body;

    if (typeof isRequesterResolved !== "boolean") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Field 'isRequesterResolved' must be a boolean",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { isRequesterResolved },
        select: {
          id: true,
          ticketNumber: true,
          isRequesterResolved: true,
          currentStatus: true,
        },
      });

      return res.status(200).json(updated);
    } catch (err: unknown) {
      console.error("PATCH /api/tickets/:id/resolve-indicator error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update resolve indicator",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 — Public Comments & Internal Notes (Issue #6, Issue #8)
// ---------------------------------------------------------------------------

// POST /api/tickets/:id/comments: Post a public comment
app.post(
  "/api/tickets/:id/comments",
  ...requireAuthAndTicketAccess("id"),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    const { content } = req.body ?? {};

    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Comment content cannot be empty or whitespace only",
        },
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Comment content cannot exceed 2000 characters",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const newComment = await prisma.publicComment.create({
        data: {
          ticketId,
          authorId: req.user!.id,
          content: content.trim(),
        },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(201).json({
        id: newComment.id,
        ticketId: newComment.ticketId,
        authorId: newComment.authorId,
        authorName: newComment.author.name,
        authorRole: newComment.author.role,
        content: newComment.content,
        createdAt: newComment.createdAt,
      });
    } catch (err: unknown) {
      console.error("POST /api/tickets/:id/comments error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to post comment",
        },
      });
    }
  }
);

// GET /api/tickets/:id/comments: Retrieve public comments
app.get(
  "/api/tickets/:id/comments",
  ...requireAuthAndTicketAccess("id"),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);

    try {
      const prisma = getPrisma();
      const comments = await prisma.publicComment.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(200).json(
        comments.map((c) => ({
          id: c.id,
          ticketId: c.ticketId,
          authorId: c.authorId,
          authorName: c.author.name,
          authorRole: c.author.role,
          content: c.content,
          createdAt: c.createdAt,
        }))
      );
    } catch (err: unknown) {
      console.error("GET /api/tickets/:id/comments error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch comments",
        },
      });
    }
  }
);

// POST /api/tickets/:id/notes: Post an internal note (IT_STAFF only)
app.post(
  "/api/tickets/:id/notes",
  requireAuth(),
  async (req: Request, res: Response) => {
    if (req.user!.role !== "IT_STAFF") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Internal notes are restricted to IT Staff",
        },
      });
    }

    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found",
        },
      });
    }

    const { content } = req.body ?? {};

    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Note content cannot be empty or whitespace only",
        },
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Note content cannot exceed 2000 characters",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found",
          },
        });
      }

      const note = await prisma.internalNote.create({
        data: {
          ticketId,
          authorId: req.user!.id,
          content: content.trim(),
        },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      });

      return res.status(201).json({
        id: note.id,
        ticketId: note.ticketId,
        authorId: note.authorId,
        authorName: note.author.name,
        content: note.content,
        createdAt: note.createdAt,
      });
    } catch (err: unknown) {
      console.error("POST /api/tickets/:id/notes error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to post note",
        },
      });
    }
  }
);

// GET /api/tickets/:id/notes: Retrieve internal notes (IT_STAFF only)
app.get(
  "/api/tickets/:id/notes",
  requireAuth(),
  async (req: Request, res: Response) => {
    if (req.user!.role !== "IT_STAFF") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Internal notes are restricted to IT Staff",
        },
      });
    }

    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found",
          },
        });
      }

      const notes = await prisma.internalNote.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          ticketId: true,
          authorId: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      });

      return res.status(200).json(
        notes.map((n) => ({
          id: n.id,
          ticketId: n.ticketId,
          authorId: n.authorId,
          authorName: n.author.name,
          content: n.content,
          createdAt: n.createdAt,
        }))
      );
    } catch (err: unknown) {
      console.error("GET /api/tickets/:id/notes error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch notes",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 Issue 7 — IT Staff Ticket Queue: GET /api/staff/tickets
// ---------------------------------------------------------------------------
const ALLOWED_STAFF_SORT_BY = [
  "createdAt",
  "updatedAt",
  "itPriority",
  "status",
  "ticketNumber",
] as const;
const ALLOWED_STAFF_SORT_ORDER = ["asc", "desc"] as const;
const ALLOWED_STAFF_PAGE_SIZES = [5, 10, 20, 50] as const;
type StaffSortBy = (typeof ALLOWED_STAFF_SORT_BY)[number];
type StaffSortOrder = (typeof ALLOWED_STAFF_SORT_ORDER)[number];

const VALID_TICKET_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

const VALID_STAFF_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

app.get(
  "/api/staff/tickets",
  ...requireITStaffOnly(),
  async (req: Request, res: Response) => {
    const validationErrors: { field: string; message: string }[] = [];

    // search (optional, substring across ticketNumber, summary, requester.name)
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    // categoryId (optional, positive integer)
    let categoryIdFilter: number | undefined;
    if (req.query.categoryId !== undefined && req.query.categoryId !== "") {
      const parsed = Number(req.query.categoryId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        validationErrors.push({
          field: "categoryId",
          message: "categoryId must be a positive integer",
        });
      } else {
        categoryIdFilter = parsed;
      }
    }

    // status (optional, single or comma-separated TicketStatus values)
    let statusFilter: TicketStatus[] | undefined;
    if (req.query.status !== undefined && req.query.status !== "") {
      const rawStatuses = String(req.query.status)
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const invalidStatus = rawStatuses.find(
        (s) => !VALID_TICKET_STATUSES.includes(s as any)
      );

      if (invalidStatus || rawStatuses.length === 0) {
        validationErrors.push({
          field: "status",
          message: `status must be one or more of: ${VALID_TICKET_STATUSES.join(", ")}`,
        });
      } else {
        statusFilter = rawStatuses as TicketStatus[];
      }
    }

    // priority (optional, LOW | MEDIUM | HIGH | URGENT, filters itPriority)
    let priorityFilter: Priority | undefined;
    if (req.query.priority !== undefined && req.query.priority !== "") {
      const normalizedPriority = String(req.query.priority).trim().toUpperCase();
      if (!VALID_STAFF_PRIORITIES.includes(normalizedPriority as any)) {
        validationErrors.push({
          field: "priority",
          message: `priority must be one of: ${VALID_STAFF_PRIORITIES.join(", ")}`,
        });
      } else {
        priorityFilter = normalizedPriority as Priority;
      }
    }

    // ownerId (optional, positive integer or 'unassigned')
    let ownerIdFilter: number | null | undefined;
    if (req.query.ownerId !== undefined && req.query.ownerId !== "") {
      const rawOwner = String(req.query.ownerId).trim().toLowerCase();
      if (rawOwner === "unassigned") {
        ownerIdFilter = null;
      } else {
        const parsed = Number(rawOwner);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          validationErrors.push({
            field: "ownerId",
            message: "ownerId must be a positive integer or 'unassigned'",
          });
        } else {
          ownerIdFilter = parsed;
        }
      }
    }

    // sortBy (optional, default "createdAt")
    let sortBy: StaffSortBy = "createdAt";
    if (req.query.sortBy !== undefined && req.query.sortBy !== "") {
      if (!ALLOWED_STAFF_SORT_BY.includes(req.query.sortBy as StaffSortBy)) {
        validationErrors.push({
          field: "sortBy",
          message: `sortBy must be one of: ${ALLOWED_STAFF_SORT_BY.join(", ")}`,
        });
      } else {
        sortBy = req.query.sortBy as StaffSortBy;
      }
    }

    // sortOrder (optional, default "desc")
    let sortOrder: StaffSortOrder = "desc";
    if (req.query.sortOrder !== undefined && req.query.sortOrder !== "") {
      if (!ALLOWED_STAFF_SORT_ORDER.includes(req.query.sortOrder as StaffSortOrder)) {
        validationErrors.push({
          field: "sortOrder",
          message: "sortOrder must be 'asc' or 'desc'",
        });
      } else {
        sortOrder = req.query.sortOrder as StaffSortOrder;
      }
    }

    // page (optional, default 1, must be >= 1)
    let page = 1;
    if (req.query.page !== undefined && req.query.page !== "") {
      const parsed = Number(req.query.page);
      if (!Number.isInteger(parsed) || parsed < 1) {
        validationErrors.push({
          field: "page",
          message: "page must be a positive integer",
        });
      } else {
        page = parsed;
      }
    }

    // pageSize (optional, default 10, must be in [5, 10, 20, 50])
    let pageSize = 10;
    if (req.query.pageSize !== undefined && req.query.pageSize !== "") {
      const parsed = Number(req.query.pageSize);
      if (!ALLOWED_STAFF_PAGE_SIZES.includes(parsed as any)) {
        validationErrors.push({
          field: "pageSize",
          message: `pageSize must be one of: ${ALLOWED_STAFF_PAGE_SIZES.join(", ")}`,
        });
      } else {
        pageSize = parsed;
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: validationErrors,
        },
      });
    }

    try {
      const prisma = getPrisma();
      const skip = (page - 1) * pageSize;

      // Build Prisma WhereInput
      const where: Prisma.TicketWhereInput = {
        ...(search && {
          OR: [
            { ticketNumber: { contains: search, mode: "insensitive" } },
            { summary: { contains: search, mode: "insensitive" } },
            { requester: { name: { contains: search, mode: "insensitive" } } },
          ],
        }),
        ...(categoryIdFilter !== undefined && { categoryId: categoryIdFilter }),
        ...(statusFilter && {
          currentStatus: statusFilter.length === 1 ? statusFilter[0] : { in: statusFilter },
        }),
        ...(priorityFilter !== undefined && { itPriority: priorityFilter }),
        ...(ownerIdFilter !== undefined && {
          ownerId: ownerIdFilter === null ? null : ownerIdFilter,
        }),
      };

      // Priority sort order custom handling: LOW=1, MEDIUM=2, HIGH=3, URGENT=4
      if (sortBy === "itPriority") {
        const priorityOrderSql =
          sortOrder === "asc"
            ? `CASE "itPriority" WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 WHEN 'URGENT' THEN 4 ELSE 5 END ASC`
            : `CASE "itPriority" WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END ASC`;

        // Fetch all matching IDs ordered
        // We can build the raw SQL where or use Prisma to get total and filtered tickets
        // For simplicity and 100% Postgres precision, count and order IDs via raw or standard
        // Given Prisma doesn't sort enums by custom order natively:
        const whereConditions: string[] = [];
        const rawParams: unknown[] = [];
        let pIdx = 1;

        if (search) {
          whereConditions.push(
            `("tickets"."ticketNumber" ILIKE $${pIdx} OR "tickets"."summary" ILIKE $${pIdx + 1} OR "u"."name" ILIKE $${pIdx + 2})`
          );
          rawParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
          pIdx += 3;
        }

        if (categoryIdFilter !== undefined) {
          whereConditions.push(`"tickets"."categoryId" = $${pIdx++}`);
          rawParams.push(categoryIdFilter);
        }

        if (statusFilter && statusFilter.length > 0) {
          const statusPlaceholders = statusFilter.map((s) => `'${s}'::"TicketStatus"`).join(", ");
          whereConditions.push(`"tickets"."currentStatus" IN (${statusPlaceholders})`);
        }

        if (priorityFilter !== undefined) {
          whereConditions.push(`"tickets"."itPriority" = $${pIdx++}::"Priority"`);
          rawParams.push(priorityFilter);
        }

        if (ownerIdFilter !== undefined) {
          if (ownerIdFilter === null) {
            whereConditions.push(`"tickets"."ownerId" IS NULL`);
          } else {
            whereConditions.push(`"tickets"."ownerId" = $${pIdx++}`);
            rawParams.push(ownerIdFilter);
          }
        }

        const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

        const idRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
          `SELECT "tickets".id FROM tickets LEFT JOIN users u ON "tickets"."requesterId" = u.id ${whereSql} ORDER BY ${priorityOrderSql}, "tickets".id ${sortOrder.toUpperCase()}`,
          ...rawParams
        );

        const totalItems = idRows.length;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const pagedIds = idRows.slice(skip, skip + pageSize).map((r) => r.id);

        const ticketsMap = new Map<number, any>();
        if (pagedIds.length > 0) {
          const tickets = await prisma.ticket.findMany({
            where: { id: { in: pagedIds } },
            select: {
              id: true,
              ticketNumber: true,
              summary: true,
              category: { select: { id: true, name: true } },
              requestedPriority: true,
              itPriority: true,
              currentStatus: true,
              owner: { select: { id: true, name: true } },
              requester: { select: { id: true, name: true } },
              isRequesterResolved: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          for (const t of tickets) ticketsMap.set(t.id, t);
        }

        const items = pagedIds.map((id) => {
          const t = ticketsMap.get(id);
          if (!t) return null;
          return {
            id: t.id,
            ticketNumber: t.ticketNumber,
            summary: t.summary,
            category: t.category,
            requestedPriority: t.requestedPriority,
            itPriority: t.itPriority,
            status: t.currentStatus,
            owner: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
            requester: { id: t.requester.id, name: t.requester.name },
            isRequesterResolved: t.isRequesterResolved,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          };
        }).filter(Boolean);

        return res.status(200).json({
          items,
          pagination: { page, pageSize, totalItems, totalPages },
        });
      }

      // Standard Prisma orderBy
      const fieldMap: Record<Exclude<StaffSortBy, "itPriority">, string> = {
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        status: "currentStatus",
        ticketNumber: "ticketNumber",
      };

      const orderByField = fieldMap[sortBy as Exclude<StaffSortBy, "itPriority">];
      const orderBy = { [orderByField]: sortOrder };

      const [tickets, totalItems] = await Promise.all([
        prisma.ticket.findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            category: { select: { id: true, name: true } },
            requestedPriority: true,
            itPriority: true,
            currentStatus: true,
            owner: { select: { id: true, name: true } },
            requester: { select: { id: true, name: true } },
            isRequesterResolved: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize) || 1;

      const items = tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        category: t.category,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        status: t.currentStatus,
        owner: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
        requester: { id: t.requester.id, name: t.requester.name },
        isRequesterResolved: t.isRequesterResolved,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      return res.status(200).json({
        items,
        pagination: { page, pageSize, totalItems, totalPages },
      });
    } catch (err: unknown) {
      console.error("GET /api/staff/tickets error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch staff tickets",
        },
      });
    }
  }
);

// GET /api/staff/users: Retrieve active assignees (IT_STAFF and ADMINISTRATOR)
app.get(
  "/api/staff/users",
  ...requireITStaffOnly(),
  async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      const users = await prisma.user.findMany({
        where: {
          role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });
      return res.status(200).json(users);
    } catch (err: unknown) {
      console.error("GET /api/staff/users error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch staff users",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 Issue 8 — IT Staff Ticket Detail Operations Endpoints (§5.2, §5.3, §5.4)
// ---------------------------------------------------------------------------

const VALID_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: [],
  CANCELLED: [],
};

// PATCH /api/staff/tickets/:id/owner: Claim or Assign Ticket Ownership
app.patch(
  "/api/staff/tickets/:id/owner",
  ...requireITStaffOnly(),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid ticket ID",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found",
          },
        });
      }

      let targetOwnerId: number;
      if (req.body.ownerId !== undefined && req.body.ownerId !== null) {
        const parsed = Number(req.body.ownerId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "ownerId must be a positive integer",
            },
          });
        }

        const targetUser = await prisma.user.findUnique({
          where: { id: parsed },
        });

        if (!targetUser) {
          return res.status(400).json({
            error: {
              code: "INVALID_OWNER",
              message: "Target owner does not exist",
            },
          });
        }

        if (!targetUser.isActive) {
          return res.status(400).json({
            error: {
              code: "INACTIVE_OWNER",
              message: "Target owner is inactive",
            },
          });
        }

        if (targetUser.role === "REQUESTER") {
          return res.status(400).json({
            error: {
              code: "INVALID_ROLE",
              message: "Target owner cannot have role REQUESTER",
            },
          });
        }

        targetOwnerId = targetUser.id;
      } else {
        // Defaults to authenticated IT Staff user claiming ticket
        targetOwnerId = req.user!.id;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { ownerId: targetOwnerId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(200).json({
        id: updatedTicket.id,
        ticketNumber: updatedTicket.ticketNumber,
        ownerId: updatedTicket.ownerId,
        owner: updatedTicket.owner ? { id: updatedTicket.owner.id, name: updatedTicket.owner.name } : null,
        status: updatedTicket.currentStatus,
        currentStatus: updatedTicket.currentStatus,
        requestedPriority: updatedTicket.requestedPriority,
        itPriority: updatedTicket.itPriority,
        updatedAt: updatedTicket.updatedAt,
      });
    } catch (err: unknown) {
      console.error("PATCH /api/staff/tickets/:id/owner error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update ticket owner",
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/priority: Update IT Priority
app.patch(
  "/api/staff/tickets/:id/priority",
  ...requireITStaffOnly(),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid ticket ID",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found",
          },
        });
      }

      const { itPriority } = req.body ?? {};
      const validPriorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

      if (!itPriority || !validPriorities.includes(itPriority)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid priority. Must be one of LOW, MEDIUM, HIGH, URGENT",
          },
        });
      }

      // Update itPriority only; requestedPriority remains unchanged per BR-13/BR-14
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { itPriority },
      });

      return res.status(200).json({
        id: updatedTicket.id,
        ticketNumber: updatedTicket.ticketNumber,
        requestedPriority: updatedTicket.requestedPriority,
        itPriority: updatedTicket.itPriority,
        status: updatedTicket.currentStatus,
        currentStatus: updatedTicket.currentStatus,
        updatedAt: updatedTicket.updatedAt,
      });
    } catch (err: unknown) {
      console.error("PATCH /api/staff/tickets/:id/priority error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update IT priority",
        },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/status: Update Ticket Status (Workflow Transition)
app.patch(
  "/api/staff/tickets/:id/status",
  ...requireITStaffOnly(),
  async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid ticket ID",
        },
      });
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found",
          },
        });
      }

      const { status: targetStatus } = req.body ?? {};
      const validStatuses: TicketStatus[] = [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED",
      ];

      if (!targetStatus || !validStatuses.includes(targetStatus)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid status. Must be one of ${validStatuses.join(", ")}`,
          },
        });
      }

      const allowedNextStatuses = VALID_STATUS_TRANSITIONS[ticket.currentStatus] || [];
      if (!allowedNextStatuses.includes(targetStatus)) {
        return res.status(400).json({
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: `Transition from ${ticket.currentStatus} to ${targetStatus} is not permitted`,
          },
        });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { currentStatus: targetStatus },
      });

      return res.status(200).json({
        id: updatedTicket.id,
        ticketNumber: updatedTicket.ticketNumber,
        status: updatedTicket.currentStatus,
        currentStatus: updatedTicket.currentStatus,
        updatedAt: updatedTicket.updatedAt,
      });
    } catch (err: unknown) {
      console.error("PATCH /api/staff/tickets/:id/status error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update ticket status",
        },
      });
    }
  }
);

/**
 * Build a parameterised WHERE clause string for raw SQL queries.
 * Returns { sql: string, params: unknown[] } where sql begins with "WHERE" or is empty.
 */
function buildRawWhereClause(
  requesterId: number,
  search: string,
  categoryIdFilter: number | undefined,
  statusFilter: string | undefined,
  priorityFilter: Priority | undefined
): { sql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  // Always filter by requesterId
  conditions.push(`"requesterId" = $${idx++}`);
  params.push(requesterId);

  if (search) {
    conditions.push(`(summary ILIKE $${idx} OR "ticketNumber" ILIKE $${idx + 1})`);
    params.push(`%${search}%`, `%${search}%`);
    idx += 2;
  }

  if (categoryIdFilter !== undefined) {
    conditions.push(`"categoryId" = $${idx++}`);
    params.push(categoryIdFilter);
  }

  if (statusFilter !== undefined) {
    conditions.push(`"currentStatus" = $${idx++}::"TicketStatus"`);
    params.push(statusFilter);
  }

  if (priorityFilter !== undefined) {
    conditions.push(`"requestedPriority" = $${idx++}::"Priority"`);
    params.push(priorityFilter);
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function getExtensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    default:
      return ".bin";
  }
}

export default app;

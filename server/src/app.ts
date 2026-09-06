import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Priority, Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { requireRequester } from "./middleware/requesterAuth.js";
import { generateTicketNumber } from "./services/ticketNumber.js";

export const app = express();

app.use(cors());
app.use(express.json());

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

// ---------------------------------------------------------------------------
// Lab 2 Issue 3 — Requester Endpoints
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
    });
    res.status(200).json(requesters);
  } catch (_err: unknown) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch requesters",
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
app.post("/api/tickets", requireRequester, async (req: Request, res: Response) => {
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
          requesterId: req.requester!.id, // Authenticated requester from context
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
  requireRequester,
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

    if (!ticket || ticket.requesterId !== req.requester!.id) {
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

app.get("/api/tickets", requireRequester, async (req: Request, res: Response) => {
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
    if (!VALID_PRIORITIES.includes(rawPriority as Priority)) {
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
  const requesterId = req.requester!.id;

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
        ticketNumber: string;
        summary: string;
        requestedPriority: Priority;
        currentStatus: "NEW";
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

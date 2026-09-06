import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { Priority } from "@prisma/client";
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

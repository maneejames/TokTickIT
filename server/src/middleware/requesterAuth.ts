import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export interface AuthenticatedRequester {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      requester?: AuthenticatedRequester;
    }
  }
}

/**
 * Reusable middleware that enforces requester presence and active status.
 * Reads X-Requester-Id header.
 * - 401 Unauthorized if missing
 * - 404 Not Found if non-existent or invalid id format
 * - 403 Forbidden if inactive
 */
export async function requireRequester(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const headerVal = req.header("x-requester-id");
  if (!headerVal) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing X-Requester-Id header",
      },
    });
  }

  const requesterId = Number(headerVal);
  if (!Number.isInteger(requesterId) || requesterId <= 0) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Requester not found",
      },
    });
  }

  try {
    const requester = await getPrisma().requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Requester not found",
        },
      });
    }

    if (!requester.isActive) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Requester is inactive",
        },
      });
    }

    req.requester = requester;
    next();
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to validate requester",
      },
    });
  }
}

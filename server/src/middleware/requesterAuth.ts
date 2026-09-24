import { Request, Response, NextFunction } from "express";
import { authenticateSession } from "../auth.js";

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
 * Session-based middleware that enforces requester presence and active status.
 * - 401 Unauthorized if not logged in
 * - 403 Forbidden if inactive or mustChangePassword
 */
export async function requireRequester(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authUser = req.user ?? (await authenticateSession(req));
  if (!authUser) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  if (authUser.mustChangePassword) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Mandatory password change required before accessing application resources",
      },
    });
  }

  if (!authUser.isActive) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Requester is inactive",
      },
    });
  }

  req.user = authUser;
  req.requester = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    department: "IT",
    isActive: authUser.isActive,
  };
  return next();
}

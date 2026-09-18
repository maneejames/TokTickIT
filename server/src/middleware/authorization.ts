import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import { authenticateSession } from "../auth.js";

/**
 * Authorization middleware factory functions for role-based and ownership-based access control.
 * Implements specification.md §6 Authorization Matrix and BR-06, BR-07, BR-08.
 * 
 * TRANSITIONAL DUAL-AUTH SUPPORT (Issue #5):
 * For Requester-role endpoints only, accepts EITHER:
 * - Session authentication (Lab 3+), OR
 * - Legacy X-Requester-Id header (Lab 2 compatibility)
 * 
 * Issue #6 will remove the X-Requester-Id path once frontend fully migrates to sessions.
 */

type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

/**
 * Middleware to require authentication and optionally enforce mustChangePassword barrier.
 * Returns 401 if not authenticated.
 * Returns 403 if mustChangePassword is true (unless bypassPasswordCheck is true).
 * 
 * TRANSITIONAL: For Requester-role endpoints, also accepts legacy X-Requester-Id header.
 */
export function requireAuth(
  bypassPasswordCheck = false,
  allowLegacyRequester = false,
  allowLegacyRequesterQuery = false,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First try: session authentication
    if (req.user) {
      // BR-02 / AC-02: Block operational endpoints if mustChangePassword is true
      if (!bypassPasswordCheck && req.user.mustChangePassword) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Mandatory password change required before accessing application resources",
          },
        });
      }
      return next();
    }

    // Second try: legacy X-Requester-Id header (transitional support for Lab 2 regression)
    const headerVal = allowLegacyRequester
      ? req.header("x-requester-id") ??
        (allowLegacyRequesterQuery ? req.query.requesterId?.toString() : undefined)
      : undefined;
    if (headerVal) {
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
        const prisma = getPrisma();
        const legacyRequester = await prisma.requesterUser.findUnique({
          where: { id: requesterId },
        });

        if (!legacyRequester) {
          return res.status(404).json({
            error: {
              code: "NOT_FOUND",
              message: "Requester not found",
            },
          });
        }

        if (!legacyRequester.isActive) {
          return res.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Requester is inactive",
            },
          });
        }

        // Populate req.user with legacy requester data in User format
        // This allows downstream middleware to treat it as authenticated
        req.user = {
          id: legacyRequester.id,
          name: legacyRequester.name,
          email: legacyRequester.email,
          role: "REQUESTER" as Role,
          isActive: legacyRequester.isActive,
          mustChangePassword: false, // Legacy users don't have password change requirement
        };

        return next();
      } catch (_err) {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to validate requester",
          },
        });
      }
    }

    // No authentication found
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  };
}

/**
 * Middleware to require specific role(s).
 * Returns 403 if authenticated user does not have one of the allowed roles.
 * Must be chained after requireAuth().
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // Should never happen if requireAuth is properly chained
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }

    next();
  };
}

/**
 * Middleware to require ticket ownership by the authenticated Requester.
 * Returns 404 (not 403) if ticket doesn't exist or is not owned by the requester,
 * per BR-08 and specification §6 to prevent resource enumeration.
 * 
 * IT_STAFF can access any ticket (bypasses ownership check).
 * Must be chained after requireAuth().
 * 
 * @param ticketIdParam - The name of the route parameter containing the ticket ID (default: "id")
 */
export function requireTicketOwnership(ticketIdParam = "id", notFoundMessage = "Ticket not found") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // IT_STAFF can access any ticket
    if (req.user.role === "IT_STAFF") {
      return next();
    }

    // For REQUESTER: verify ownership
    if (req.user.role === "REQUESTER") {
      const ticketId = Number(req.params[ticketIdParam]);
      
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: notFoundMessage,
          },
        });
      }

      try {
        const prisma = getPrisma();
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { id: true, requesterId: true },
        });

        if (!ticket || ticket.requesterId !== req.user.id) {
          // Return 404 (not 403) to prevent ticket enumeration
          return res.status(404).json({
            error: {
              code: "NOT_FOUND",
            message: notFoundMessage,
            },
          });
        }

        // Ticket exists and is owned by requester
        return next();
      } catch (_err) {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to verify ticket ownership",
          },
        });
      }
    }

    // ADMINISTRATOR or other roles: no access to ticket operations
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      },
    });
  };
}

/**
 * Combined middleware: Require authentication + specific role(s) + optional password check bypass.
 * Convenience function that chains requireAuth and requireRole.
 */
export function requireAuthAndRole(allowedRoles: Role[], bypassPasswordCheck = false) {
  return [requireAuth(bypassPasswordCheck), requireRole(...allowedRoles)];
}

/**
 * Combined middleware: Require authentication + ticket ownership (Requester) or IT_STAFF access.
 * Convenience function that chains requireAuth and requireTicketOwnership.
 */
export function requireAuthAndTicketAccess(ticketIdParam = "id") {
  return [requireAuth(false, true), requireTicketOwnership(ticketIdParam)];
}

/** Requester-only ticket operation, including ownership enforcement. */
export function requireRequesterTicketAccess(ticketIdParam = "id", notFoundMessage = "Ticket not found") {
  return [
    requireAuth(false, true),
    requireRole("REQUESTER"),
    requireTicketOwnership(ticketIdParam, notFoundMessage),
  ];
}

/**
 * Middleware specifically for Requester-only operations (create ticket, my tickets list).
 * Returns 403 for IT_STAFF and ADMINISTRATOR.
 */
export function requireRequesterOnly() {
  return [requireAuth(false, true), requireRole("REQUESTER")];
}

/**
 * Middleware specifically for IT Staff-only operations (queue, ticket management, internal notes).
 * Returns 403 for REQUESTER and ADMINISTRATOR.
 */
export function requireITStaffOnly() {
  return [requireAuth(), requireRole("IT_STAFF")];
}

/**
 * Middleware specifically for Administrator-only operations (user management).
 * Returns 403 for REQUESTER and IT_STAFF.
 */
export function requireAdminOnly() {
  return [requireAuth(), requireRole("ADMINISTRATOR")];
}

/**
 * Middleware for endpoints accessible to multiple specific roles.
 * Example: Public comments accessible to REQUESTER (own) and IT_STAFF (any).
 */
export function requireAnyRole(...allowedRoles: Role[]) {
  return [requireAuth(), requireRole(...allowedRoles)];
}

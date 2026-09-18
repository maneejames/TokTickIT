import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { getPrisma } from "./prisma.js";

// Session data stored in memory/cache
interface SessionData {
  userId: number;
  createdAt: number;
  expiresAt: number;
}

// In-memory token store for signed session tokens
const sessionStore = new Map<string, SessionData>();

// Session validity: 24 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Parses cookies from Cookie header string without external dependencies.
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

/**
 * Creates a cryptographically random session token and stores it.
 */
export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessionStore.set(token, {
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  return token;
}

/**
 * Destroys a session server-side.
 */
export function destroySession(token: string): boolean {
  return sessionStore.delete(token);
}

/**
 * Extracts session token from Cookie or Authorization header.
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Check Cookie: toktickit_session
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.toktickit_session) {
    return cookies.toktickit_session;
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Authenticates the session and performs the mandatory BR-10 / BR-11 DB re-validation.
 * If user is inactive or not found, session is rejected with 401.
 * If user mustChangePassword, flags it on req.user.
 */
export async function authenticateSession(req: Request): Promise<AuthenticatedUser | null> {
  const token = extractSessionToken(req);
  if (!token) return null;

  const session = sessionStore.get(token);
  if (!session) return null;

  // Check TTL
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    return null;
  }

  // BR-10 / BR-11: Database re-validation on every request
  const prisma = getPrisma();
  const dbUser = await (prisma as any).user.findUnique({
    where: { id: session.userId },
  });

  if (!dbUser || !dbUser.isActive) {
    // If deactivated or deleted, invalidate session immediately
    sessionStore.delete(token);
    return null;
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    isActive: dbUser.isActive,
    mustChangePassword: dbUser.mustChangePassword,
  };
}

/**
 * Express middleware to require authentication.
 * Returns 401 if missing/invalid/expired.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authenticateSession(req);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    req.user = user;
    next();
  } catch (_err) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to authenticate session",
      },
    });
  }
}

/**
 * Guard that blocks normal operational endpoints if mustChangePassword is true.
 * Returns 403 Forbidden per BR-02 / AC-02.
 */
export function requirePasswordSatisfied(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.mustChangePassword) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Mandatory password change required before accessing application resources",
      },
    });
  }
  next();
}

/**
 * Validates password complexity per BR-08:
 * - min 8 chars
 * - at least 1 uppercase
 * - at least 1 lowercase
 * - at least 1 digit
 * - at least 1 special character [!@#$%^&*(),.?":{}|<>]
 */
export function validatePasswordComplexity(password: string): boolean {
  if (typeof password !== "string" || password.length < 8) {
    return false;
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

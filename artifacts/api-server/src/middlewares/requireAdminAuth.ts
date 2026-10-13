import type { RequestHandler } from "express";
import { clerkBypass } from "./devAuth";
import { requireAuth } from "./requireAuth";
import { verifySessionToken } from "../lib/adminAuth";

declare global {
  namespace Express {
    interface Request {
      adminUser?: { username: string };
    }
  }
}

/**
 * Guards admin-only routes. Locally (Clerk bypass) it validates a Bearer
 * session token issued by POST /api/auth/login. On hosted environments it
 * falls back to the existing Clerk-based admin check.
 */
export const requireAdminAuth: RequestHandler = async (req, res, next) => {
  if (clerkBypass) {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      req.adminUser = verifySessionToken(token);
      next();
      return;
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  await requireAuth(req, res, next);
};
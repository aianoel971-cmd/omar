import type { RequestHandler } from "express";

export const clerkBypass = !process.env.CLERK_SECRET_KEY;

export function devAuthMiddleware(): RequestHandler {
  return (_req, _res, next) => next();
}
import { clerkClient, getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(/[\n,;]+/)
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (adminEmails.length === 0) {
    res.status(503).json({ error: "Admin access has not been configured." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const primaryEmail = user.emailAddresses
      .find((email) => email.id === user.primaryEmailAddressId)
      ?.emailAddress.toLowerCase();

    if (!primaryEmail || !adminEmails.includes(primaryEmail)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  } catch {
    res.status(503).json({ error: "Admin access could not be verified." });
  }
};

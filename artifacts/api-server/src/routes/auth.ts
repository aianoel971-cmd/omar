import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { adminUsersTable, db } from "@workspace/db";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
} from "../lib/adminAuth";
import { requireAdminAuth } from "../middlewares/requireAdminAuth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = (req.body ?? {}) as {
    username?: unknown;
    password?: unknown;
  };
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password
  ) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username.trim()));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  res.json({ token: createSessionToken(user.username), username: user.username });
});

router.get("/auth/me", requireAdminAuth, async (req, res): Promise<void> => {
  res.json({ username: req.adminUser?.username ?? "admin" });
});

router.post(
  "/auth/change-password",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const { currentPassword, newPassword } = (req.body ?? {}) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      res.status(400).json({
        error: "Current password and a new password of at least 6 characters are required",
      });
      return;
    }

    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, req.adminUser?.username ?? ""));
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    await db
      .update(adminUsersTable)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(adminUsersTable.id, user.id));

    res.json({ ok: true });
  },
);

export default router;
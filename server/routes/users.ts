import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq, ilike, sql } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, requireSuperAdmin, logAudit } from "../middleware/auth.js";
import { sendInviteEmail, isMailConfigured } from "../mailer.js";

const router = Router();

router.get("/api/users", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const q = (req.query.q as string) || "";

    let rows = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.profiles.fullName,
        siteId: schema.profiles.siteId,
        suspended: schema.profiles.suspended,
        quotaBytes: schema.profiles.quotaBytes,
        role: schema.userRoles.role,
      })
      .from(schema.users)
      .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.id))
      .leftJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId));

    if (q) {
      rows = rows.filter(
        (r) =>
          (r.fullName?.toLowerCase().includes(q.toLowerCase()) ?? false) ||
          r.email.toLowerCase().includes(q.toLowerCase())
      );
    }

    res.json(rows);
  } catch (err) {
    console.error("Users list error:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

router.post("/api/users/invite", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { email, siteId } = req.body;
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [user] = await db.insert(schema.users).values({
      email,
      passwordHash,
    }).returning();

    await db.insert(schema.profiles).values({
      id: user.id,
      email,
      fullName: email.split("@")[0],
      siteId: siteId || null,
    });

    await db.insert(schema.userRoles).values({
      userId: user.id,
      role: "admin",
    });

    await logAudit(req.user!.userId, siteId || null, "admin.invited", email);

    const [inviterProfile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, req.user!.userId));
    const inviterName = inviterProfile?.fullName || "An admin";

    try {
      await sendInviteEmail(email, tempPassword, inviterName);
    } catch (mailErr) {
      console.error("Failed to send invite email:", mailErr);
    }

    res.status(201).json({
      id: user.id,
      email,
      fullName: email.split("@")[0],
      role: "admin",
      siteId: siteId || null,
      suspended: false,
      emailSent: isMailConfigured(),
    });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: "Failed to invite user" });
  }
});

router.patch("/api/users/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { suspended } = req.body;

    const [updated] = await db
      .update(schema.profiles)
      .set({ suspended })
      .where(eq(schema.profiles.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const action = suspended ? "admin.suspended" : "admin.reactivated";
    await logAudit(req.user!.userId, updated.siteId, action, updated.email ?? "");

    res.json(updated);
  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/api/users/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;

    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, id));

    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, id));
    await db.delete(schema.profiles).where(eq(schema.profiles.id, id));
    await db.delete(schema.users).where(eq(schema.users.id, id));

    if (profile) {
      await logAudit(req.user!.userId, profile.siteId, "admin.deleted", profile.email ?? "");
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error("User delete error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.get("/api/smtp-status", requireAuth, requireSuperAdmin, async (_req, res) => {
  res.json({
    configured: isMailConfigured(),
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    user: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}***` : null,
  });
});

export default router;

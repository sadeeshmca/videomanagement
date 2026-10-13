import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, isSuperAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    const roles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    const role = roles.find((r) => r.role === "super_admin") ? "super_admin" : roles[0]?.role ?? "user";
    const superAdmin = role === "super_admin";

    let site = null;
    if (profile?.siteId) {
      const [s] = await db.select().from(schema.sites).where(eq(schema.sites.id, profile.siteId));
      site = s ?? null;
    }

    res.json({
      id: userId,
      email: user?.email ?? req.user!.email,
      fullName: profile?.fullName ?? "",
      phone: profile?.phone ?? "",
      avatarUrl: profile?.avatarUrl ?? null,
      role,
      siteId: profile?.siteId ?? null,
      suspended: profile?.suspended ?? false,
      quotaBytes: profile?.quotaBytes ?? 0,
      site,
    });
  } catch (err) {
    console.error("Profile get error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.patch("/api/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { fullName, phone } = req.body;
    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;

    const [updated] = await db
      .update(schema.profiles)
      .set(updates)
      .where(eq(schema.profiles.id, userId))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/api/profile/change-password", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));

    res.json({ success: true });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;

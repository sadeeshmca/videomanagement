import { Router } from "express";
import { eq, desc, and, count as drizzleCount } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, requireSuperAdmin, logAudit } from "../middleware/auth.js";

const router = Router();

router.get("/api/broadcasts", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(schema.broadcasts).orderBy(desc(schema.broadcasts.createdAt));
    res.json(rows);
  } catch (err) {
    console.error("Broadcasts list error:", err);
    res.status(500).json({ error: "Failed to load broadcasts" });
  }
});

router.post("/api/broadcasts", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { subject, body, siteId } = req.body;

    if (!subject || !body) {
      res.status(400).json({ error: "subject and body are required" });
      return;
    }

    // Count recipients: non-suspended users, optionally filtered by site
    const conditions = [eq(schema.profiles.suspended, false)];
    if (siteId) {
      conditions.push(eq(schema.profiles.siteId, siteId));
    }
    const [{ count: recipientCount }] = await db
      .select({ count: drizzleCount() })
      .from(schema.profiles)
      .where(and(...conditions));

    const [broadcast] = await db.insert(schema.broadcasts).values({
      senderId: userId,
      siteId: siteId || null,
      subject,
      body,
      recipientCount: Number(recipientCount),
      status: "sent",
    }).returning();

    await logAudit(userId, siteId || null, "broadcast.sent", subject);

    res.status(201).json(broadcast);
  } catch (err) {
    console.error("Broadcast create error:", err);
    res.status(500).json({ error: "Failed to send broadcast" });
  }
});

export default router;

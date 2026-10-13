import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, logAudit } from "../middleware/auth.js";

const router = Router();

router.post("/api/upload", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { orderId, sku, customerPhone, title, tags, siteId, sizeBytes } = req.body;

    if (!orderId || !title || !siteId) {
      res.status(400).json({ error: "orderId, title, and siteId are required" });
      return;
    }

    const [video] = await db.insert(schema.videos).values({
      siteId,
      ownerId: userId,
      orderId,
      sku: sku || null,
      customerPhone: customerPhone || null,
      title,
      tags: tags || [],
      sizeBytes: sizeBytes || 0,
      isPublic: false,
      orderDate: new Date().toISOString().slice(0, 10),
    }).returning();

    // Update today's upload usage
    const today = new Date().toISOString().slice(0, 10);
    await db
      .insert(schema.uploadUsage)
      .values({ day: today, bytes: sizeBytes || 0 })
      .onConflictDoUpdate({
        target: schema.uploadUsage.day,
        set: { bytes: sql`${schema.uploadUsage.bytes} + ${sizeBytes || 0}` },
      });

    await logAudit(userId, siteId, "video.uploaded", orderId);

    res.status(201).json(video);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload video" });
  }
});

export default router;

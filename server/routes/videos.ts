import { Router } from "express";
import { eq, and, isNull, isNotNull, ilike, gte, lte, sql, inArray, desc, count as drizzleCount } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, isSuperAdmin, logAudit } from "../middleware/auth.js";

const router = Router();

router.get("/api/videos", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const superAdmin = await isSuperAdmin(userId);
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
    const siteId = profile?.siteId;

    const q = (req.query.q as string) || "";
    const from = (req.query.from as string) || "";
    const to = (req.query.to as string) || "";
    const view = (req.query.view as string) || "active";
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;

    const conditions = [];

    if (view === "trash") {
      conditions.push(isNotNull(schema.videos.deletedAt));
    } else {
      conditions.push(isNull(schema.videos.deletedAt));
    }

    if (!superAdmin && siteId) {
      conditions.push(eq(schema.videos.siteId, siteId));
    }

    if (q) {
      conditions.push(
        sql`(${schema.videos.orderId} ilike ${`%${q}%`} or ${schema.videos.sku} ilike ${`%${q}%`} or ${schema.videos.title} ilike ${`%${q}%`})`
      );
    }

    if (from) {
      conditions.push(gte(schema.videos.orderDate, from));
    }
    if (to) {
      conditions.push(lte(schema.videos.orderDate, to));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db.select({ count: drizzleCount() }).from(schema.videos).where(where);

    const rows = await db
      .select()
      .from(schema.videos)
      .where(where)
      .orderBy(desc(schema.videos.createdAt))
      .limit(limit)
      .offset(page * limit);

    res.json({ rows, total: Number(total) });
  } catch (err) {
    console.error("Videos list error:", err);
    res.status(500).json({ error: "Failed to load videos" });
  }
});

router.patch("/api/videos/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { tags, isPublic } = req.body;
    const updates: Record<string, unknown> = {};
    if (tags !== undefined) updates.tags = tags;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const [updated] = await db.update(schema.videos).set(updates).where(eq(schema.videos.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    await logAudit(req.user!.userId, updated.siteId, "video.updated", updated.orderId);
    res.json(updated);
  } catch (err) {
    console.error("Video update error:", err);
    res.status(500).json({ error: "Failed to update video" });
  }
});

router.post("/api/videos/delete", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) {
      res.status(400).json({ error: "ids required" });
      return;
    }

    await db
      .update(schema.videos)
      .set({ deletedAt: new Date() })
      .where(inArray(schema.videos.id, ids));

    const videos = await db.select().from(schema.videos).where(inArray(schema.videos.id, ids));
    for (const v of videos) {
      await logAudit(req.user!.userId, v.siteId, "video.deleted", v.orderId);
    }

    res.json({ deleted: ids.length });
  } catch (err) {
    console.error("Video delete error:", err);
    res.status(500).json({ error: "Failed to delete videos" });
  }
});

router.post("/api/videos/restore", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) {
      res.status(400).json({ error: "ids required" });
      return;
    }

    await db
      .update(schema.videos)
      .set({ deletedAt: null })
      .where(inArray(schema.videos.id, ids));

    const videos = await db.select().from(schema.videos).where(inArray(schema.videos.id, ids));
    for (const v of videos) {
      await logAudit(req.user!.userId, v.siteId, "video.restored", v.orderId);
    }

    res.json({ restored: ids.length });
  } catch (err) {
    console.error("Video restore error:", err);
    res.status(500).json({ error: "Failed to restore videos" });
  }
});

export default router;

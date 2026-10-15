import { Router } from "express";
import { eq, sql, and, isNull, count as drizzleCount } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, isSuperAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const superAdmin = await isSuperAdmin(userId);

    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
    const siteId = profile?.siteId;

    // Video count
    let videoCountQuery;
    if (superAdmin) {
      videoCountQuery = db.select({ count: drizzleCount() }).from(schema.videos).where(isNull(schema.videos.deletedAt));
    } else {
      videoCountQuery = db.select({ count: drizzleCount() }).from(schema.videos).where(
        and(isNull(schema.videos.deletedAt), siteId ? eq(schema.videos.siteId, siteId) : sql`false`)
      );
    }
    const [{ count: videoCount }] = await videoCountQuery;

    // User count
    let userCount: number;
    if (superAdmin) {
      const [r] = await db.select({ count: drizzleCount() }).from(schema.profiles).where(eq(schema.profiles.suspended, false));
      userCount = r.count;
    } else {
      userCount = 1;
    }

    // Backups running
    const [{ count: backupsRunning }] = await db
      .select({ count: drizzleCount() })
      .from(schema.backups)
      .where(eq(schema.backups.status, "running"));

    // My used bytes
    const [myUsed] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.videos.sizeBytes}), 0)` })
      .from(schema.videos)
      .where(and(eq(schema.videos.ownerId, userId), isNull(schema.videos.deletedAt)));

    // Site used bytes
    let siteUsedBytes = 0;
    let siteQuotaBytes = 0;
    let siteName = "";
    if (siteId) {
      const [siteRow] = await db.select().from(schema.sites).where(eq(schema.sites.id, siteId));
      if (siteRow) {
        siteName = siteRow.name;
        siteQuotaBytes = siteRow.quotaBytes;
        const [siteUsed] = await db
          .select({ total: sql<number>`coalesce(sum(${schema.videos.sizeBytes}), 0)` })
          .from(schema.videos)
          .where(and(eq(schema.videos.siteId, siteId), isNull(schema.videos.deletedAt)));
        siteUsedBytes = Number(siteUsed.total);
      }
    }

    // Today's upload bytes
    const today = new Date().toISOString().slice(0, 10);
    const [usage] = await db.select().from(schema.uploadUsage).where(eq(schema.uploadUsage.day, today));
    const todayUploadBytes = usage?.bytes ?? 0;

    // Daily upload cap
    const [capSetting] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, "daily_upload_cap_bytes"));
    const dailyUploadCap = capSetting ? Number(capSetting.value) : 805306368000;

    // Recent uploads
    const recentUploadsQuery = superAdmin
      ? db.select({ orderId: schema.videos.orderId, sku: schema.videos.sku }).from(schema.videos).where(isNull(schema.videos.deletedAt)).orderBy(sql`${schema.videos.createdAt} desc`).limit(5)
      : db.select({ orderId: schema.videos.orderId, sku: schema.videos.sku }).from(schema.videos).where(
          and(isNull(schema.videos.deletedAt), siteId ? eq(schema.videos.siteId, siteId) : sql`false`)
        ).orderBy(sql`${schema.videos.createdAt} desc`).limit(5);
    const recentUploads = await recentUploadsQuery;

    res.json({
      videoCount: Number(videoCount),
      userCount: Number(userCount),
      backupsRunning: Number(backupsRunning),
      myUsedBytes: Number(myUsed.total),
      myQuotaBytes: profile?.quotaBytes ?? 0,
      siteUsedBytes,
      siteQuotaBytes,
      siteName,
      todayUploadBytes: Number(todayUploadBytes),
      dailyUploadCap,
      recentUploads,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;

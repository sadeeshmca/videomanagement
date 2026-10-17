import { Router } from "express";
import { eq, desc, and, isNull, isNotNull, lte, count as drizzleCount } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, isSuperAdmin, logAudit } from "../middleware/auth.js";
import { isDriveConnected, ensureSiteFolder, ensureSubfolder, moveFileToFolder, listSubfolders, listFilesInFolder } from "../google-drive.js";

const router = Router();

router.get("/api/backups", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const superAdmin = await isSuperAdmin(userId);

    const rows = await db
      .select({
        id: schema.backups.id,
        userId: schema.backups.userId,
        trigger: schema.backups.trigger,
        status: schema.backups.status,
        progress: schema.backups.progress,
        videoCount: schema.backups.videoCount,
        sizeBytes: schema.backups.sizeBytes,
        createdAt: schema.backups.createdAt,
        expiresAt: schema.backups.expiresAt,
        userName: schema.profiles.fullName,
      })
      .from(schema.backups)
      .leftJoin(schema.profiles, eq(schema.backups.userId, schema.profiles.id))
      .where(superAdmin ? undefined : eq(schema.backups.userId, userId))
      .orderBy(desc(schema.backups.createdAt));

    res.json(rows);
  } catch (err) {
    console.error("Backups list error:", err);
    res.status(500).json({ error: "Failed to load backups" });
  }
});

router.post("/api/backups", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));

    const [videoCountRow] = await db
      .select({ count: drizzleCount() })
      .from(schema.videos)
      .where(and(eq(schema.videos.ownerId, userId), isNull(schema.videos.deletedAt)));

    const [backup] = await db.insert(schema.backups).values({
      userId,
      siteId: profile?.siteId ?? null,
      trigger: "manual",
      status: "queued",
      progress: 0,
      videoCount: Number(videoCountRow.count),
    }).returning();

    await logAudit(userId, profile?.siteId ?? null, "backup.started", "manual");

    res.status(201).json(backup);
  } catch (err) {
    console.error("Backup create error:", err);
    res.status(500).json({ error: "Failed to create backup" });
  }
});

router.get("/api/backup-schedule", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [schedule] = await db.select().from(schema.backupSchedules).where(eq(schema.backupSchedules.userId, userId));
    res.json(schedule ?? null);
  } catch (err) {
    console.error("Schedule get error:", err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

router.put("/api/backup-schedule", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { intervalMonths, startDate, retentionDays, enabled } = req.body;
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));

    const existing = await db.select().from(schema.backupSchedules).where(eq(schema.backupSchedules.userId, userId));

    if (existing.length > 0) {
      const [updated] = await db
        .update(schema.backupSchedules)
        .set({ intervalMonths, startDate, retentionDays, enabled, updatedAt: new Date() })
        .where(eq(schema.backupSchedules.userId, userId))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(schema.backupSchedules).values({
        userId,
        siteId: profile?.siteId ?? null,
        intervalMonths: intervalMonths ?? 3,
        startDate: startDate ?? new Date().toISOString().slice(0, 10),
        retentionDays: retentionDays ?? 180,
        enabled: enabled ?? true,
      }).returning();
      res.status(201).json(created);
    }
  } catch (err) {
    console.error("Schedule update error:", err);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

function getMonthNames(monthsBack: number): string[] {
  const names: string[] = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    names.push(d.toLocaleString("en-US", { month: "long", year: "numeric" }));
  }
  return names;
}

router.post("/api/backups/rotate", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const superAdmin = await isSuperAdmin(userId);
    if (!superAdmin) {
      res.status(403).json({ error: "Only super admins can rotate backups" });
      return;
    }

    if (!await isDriveConnected()) {
      res.status(400).json({ error: "Google Drive not connected" });
      return;
    }

    const retainMonths = req.body.retainMonths ?? 3;
    const recentMonths = new Set(getMonthNames(retainMonths));

    const sites = await db.select().from(schema.sites);
    let movedCount = 0;

    for (const site of sites) {
      if (!site.driveFolderId) continue;

      const backupFolderId = await ensureSubfolder(site.driveFolderId, "Backup");
      const subfolders = await listSubfolders(site.driveFolderId);

      for (const folder of subfolders) {
        if (folder.name === "Backup") continue;
        if (recentMonths.has(folder.name)) continue;

        const isMonthFolder = /^[A-Z][a-z]+ \d{4}$/.test(folder.name);
        if (!isMonthFolder) continue;

        await moveFileToFolder(folder.id, backupFolderId);
        movedCount++;
        console.log(`[backup-rotate] Moved "${folder.name}" to Backup for site "${site.name}"`);
      }
    }

    await logAudit(userId, null, "backup.rotated", `${movedCount} folders moved`);
    res.json({ movedFolders: movedCount, retainedMonths: Array.from(recentMonths) });
  } catch (err) {
    console.error("Backup rotate error:", err);
    res.status(500).json({ error: "Failed to rotate backups" });
  }
});

router.get("/api/backups/drive-folders", requireAuth, async (req, res) => {
  try {
    if (!await isDriveConnected()) {
      res.status(400).json({ error: "Google Drive not connected" });
      return;
    }

    const userId = req.user!.userId;
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
    const siteId = profile?.siteId;

    const superAdmin = await isSuperAdmin(userId);
    let siteList: (typeof schema.sites.$inferSelect)[];
    if (superAdmin) {
      siteList = await db.select().from(schema.sites);
    } else if (siteId) {
      siteList = await db.select().from(schema.sites).where(eq(schema.sites.id, siteId));
    } else {
      siteList = [];
    }

    const retainMonths = 3;
    const recentMonths = new Set(getMonthNames(retainMonths));
    const result: { site: string; folders: { name: string; id: string; status: string }[] }[] = [];

    for (const site of siteList) {
      if (!site.driveFolderId) continue;
      const subfolders = await listSubfolders(site.driveFolderId);
      const folders = subfolders
        .filter(f => f.name !== "Backup")
        .map(f => ({
          name: f.name,
          id: f.id,
          status: recentMonths.has(f.name) ? "active" : "archive_eligible",
        }));
      result.push({ site: site.name, folders });
    }

    res.json(result);
  } catch (err) {
    console.error("Drive folders list error:", err);
    res.status(500).json({ error: "Failed to list drive folders" });
  }
});

export default router;

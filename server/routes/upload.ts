import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import multer from "multer";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, logAudit } from "../middleware/auth.js";
import { isDriveConnected, ensureSiteFolder, uploadFile } from "../google-drive.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const router = Router();

router.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { orderId, sku, customerPhone, title, tags, siteId } = req.body;
    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;

    if (!orderId || !title || !siteId) {
      res.status(400).json({ error: "orderId, title, and siteId are required" });
      return;
    }

    const file = req.file;
    const sizeBytes = file ? file.size : Number(req.body.sizeBytes) || 0;

    let driveFileId: string | null = null;
    let driveWebViewLink: string | null = null;

    if (file && await isDriveConnected()) {
      const [site] = await db.select().from(schema.sites).where(eq(schema.sites.id, siteId));
      if (site) {
        const folderId = await ensureSiteFolder(site.name, site.driveFolderId);

        if (folderId !== site.driveFolderId) {
          await db.update(schema.sites).set({ driveFolderId: folderId }).where(eq(schema.sites.id, siteId));
        }

        const result = await uploadFile(folderId, file.originalname, file.buffer, file.mimetype);
        driveFileId = result.fileId;
        driveWebViewLink = result.webViewLink;
      }
    }

    const [video] = await db.insert(schema.videos).values({
      siteId,
      ownerId: userId,
      orderId,
      sku: sku || null,
      customerPhone: customerPhone || null,
      title,
      tags: parsedTags || [],
      sizeBytes,
      isPublic: false,
      orderDate: new Date().toISOString().slice(0, 10),
      driveFileId,
      driveWebViewLink,
      mimeType: file?.mimetype ?? null,
    }).returning();

    const today = new Date().toISOString().slice(0, 10);
    await db
      .insert(schema.uploadUsage)
      .values({ day: today, bytes: sizeBytes })
      .onConflictDoUpdate({
        target: schema.uploadUsage.day,
        set: { bytes: sql`${schema.uploadUsage.bytes} + ${sizeBytes}` },
      });

    await logAudit(userId, siteId, "video.uploaded", orderId);

    res.status(201).json(video);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload video" });
  }
});

export default router;

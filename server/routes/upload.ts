import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, logAudit } from "../middleware/auth.js";
import { isDriveConnected, ensureSiteFolder, uploadFile } from "../google-drive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TMP_DIR = path.resolve(__dirname, "..", "..", "videos_tmp");

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const router = Router();

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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

    // Step 1: Save file locally
    let localPath: string | null = null;
    if (file) {
      const ext = path.extname(file.originalname) || ".mp4";
      const localName = `${sanitize(orderId)}_${sanitize(path.basename(file.originalname, ext))}${ext}`;
      localPath = path.join(TMP_DIR, localName);
      fs.writeFileSync(localPath, file.buffer);
      console.log(`  Local copy saved: ${localPath}`);
    }

    // Step 2: Try uploading to Google Drive
    let driveFileId: string | null = null;
    let driveWebViewLink: string | null = null;
    let status = "ready";

    if (file && await isDriveConnected()) {
      try {
        const [site] = await db.select().from(schema.sites).where(eq(schema.sites.id, siteId));
        if (site) {
          const folderId = await ensureSiteFolder(site.name, site.driveFolderId);
          if (folderId !== site.driveFolderId) {
            await db.update(schema.sites).set({ driveFolderId: folderId }).where(eq(schema.sites.id, siteId));
          }

          const driveFileName = `${sanitize(orderId)}_${file.originalname}`;
          const result = await uploadFile(folderId, driveFileName, file.buffer, file.mimetype);
          driveFileId = result.fileId;
          driveWebViewLink = result.webViewLink;
          console.log(`  Uploaded to Drive: ${driveFileId}`);

          // Delete local copy after successful upload
          if (localPath && fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log(`  Local copy deleted: ${localPath}`);
            localPath = null;
          }
        }
      } catch (driveErr) {
        console.error("  Drive upload failed, will retry in background:", driveErr);
        status = "pending_drive";
      }
    }

    // Step 3: Save to database
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
      localPath,
      mimeType: file?.mimetype ?? null,
      status,
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

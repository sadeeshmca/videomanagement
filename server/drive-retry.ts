import fs from "node:fs";
import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { isDriveConnected, ensureSiteFolder, uploadFile } from "./google-drive.js";

const RETRY_INTERVAL = 60_000;
const MAX_RETRIES = 5;
let retryCount: Record<string, number> = {};

async function retryPendingUploads() {
  try {
    if (!await isDriveConnected()) return;

    const pending = await db.select()
      .from(schema.videos)
      .where(and(
        eq(schema.videos.status, "pending_drive"),
        isNotNull(schema.videos.localPath),
      ))
      .limit(5);

    if (!pending.length) return;

    console.log(`[drive-retry] ${pending.length} pending upload(s) to retry`);

    for (const video of pending) {
      const key = video.id;
      const attempts = retryCount[key] ?? 0;

      if (attempts >= MAX_RETRIES) {
        console.log(`[drive-retry] ${video.orderId}: max retries reached, marking failed`);
        await db.update(schema.videos)
          .set({ status: "drive_failed" })
          .where(eq(schema.videos.id, video.id));
        delete retryCount[key];
        continue;
      }

      if (!video.localPath || !fs.existsSync(video.localPath)) {
        console.log(`[drive-retry] ${video.orderId}: local file missing, marking failed`);
        await db.update(schema.videos)
          .set({ status: "drive_failed", localPath: null })
          .where(eq(schema.videos.id, video.id));
        delete retryCount[key];
        continue;
      }

      try {
        const [site] = await db.select().from(schema.sites).where(eq(schema.sites.id, video.siteId));
        if (!site) continue;

        const folderId = await ensureSiteFolder(site.name, site.driveFolderId);
        if (folderId !== site.driveFolderId) {
          await db.update(schema.sites).set({ driveFolderId: folderId }).where(eq(schema.sites.id, site.id));
        }

        const buffer = fs.readFileSync(video.localPath);
        const filename = video.localPath.split("/").pop()!;
        const mimeType = video.mimeType || "video/mp4";

        const result = await uploadFile(folderId, filename, buffer, mimeType);
        console.log(`[drive-retry] ${video.orderId}: uploaded to Drive (${result.fileId})`);

        await db.update(schema.videos)
          .set({
            driveFileId: result.fileId,
            driveWebViewLink: result.webViewLink,
            status: "ready",
            localPath: null,
          })
          .where(eq(schema.videos.id, video.id));

        fs.unlinkSync(video.localPath);
        console.log(`[drive-retry] ${video.orderId}: local file deleted`);
        delete retryCount[key];
      } catch (err) {
        retryCount[key] = attempts + 1;
        console.error(`[drive-retry] ${video.orderId}: attempt ${attempts + 1} failed:`, err);
      }
    }
  } catch (err) {
    console.error("[drive-retry] Error:", err);
  }
}

export function startDriveRetryWorker() {
  console.log(`[drive-retry] Background worker started (interval: ${RETRY_INTERVAL / 1000}s)`);
  setInterval(retryPendingUploads, RETRY_INTERVAL);
  setTimeout(retryPendingUploads, 5000);
}

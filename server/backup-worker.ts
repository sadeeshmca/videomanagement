import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";
import { eq, and, isNull, lte } from "drizzle-orm";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import {
  isDriveConnected,
  ensureSiteFolder,
  ensureSubfolder,
  uploadFile,
  downloadFileStream,
  getFileWebViewLink,
} from "./google-drive.js";

const POLL_INTERVAL = 15_000;

async function processQueuedBackups() {
  try {
    if (!await isDriveConnected()) return;

    const [job] = await db.select()
      .from(schema.backups)
      .where(eq(schema.backups.status, "queued"))
      .limit(1);

    if (!job) return;

    console.log(`[backup-worker] Processing backup ${job.id}`);

    await db.update(schema.backups)
      .set({ status: "running", progress: 0 })
      .where(eq(schema.backups.id, job.id));

    try {
      const videos = await db.select()
        .from(schema.videos)
        .where(and(
          eq(schema.videos.ownerId, job.userId),
          isNull(schema.videos.deletedAt),
        ));

      const driveVideos = videos.filter(v => v.driveFileId);

      if (driveVideos.length === 0) {
        await db.update(schema.backups)
          .set({ status: "completed", progress: 100, videoCount: 0, sizeBytes: 0, finishedAt: new Date() })
          .where(eq(schema.backups.id, job.id));
        console.log(`[backup-worker] Backup ${job.id}: no videos to back up`);
        return;
      }

      const archive = new ZipArchive({ zlib: { level: 5 } });
      const chunks: Buffer[] = [];
      const passthrough = new PassThrough();

      passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));

      const archiveFinished = new Promise<void>((resolve, reject) => {
        passthrough.on("end", resolve);
        passthrough.on("error", reject);
        archive.on("error", reject);
      });

      archive.pipe(passthrough);

      let processed = 0;
      for (const video of driveVideos) {
        try {
          const stream = await downloadFileStream(video.driveFileId!);
          const ext = video.mimeType?.includes("mp4") ? ".mp4" : video.mimeType?.includes("webm") ? ".webm" : ".mp4";
          const filename = `${video.orderId}_${video.title.replace(/[^a-zA-Z0-9._-]/g, "_")}${ext}`;
          archive.append(stream as any, { name: filename });
        } catch (err) {
          console.error(`[backup-worker] Failed to add ${video.orderId}:`, err);
        }

        processed++;
        const progress = Math.round((processed / driveVideos.length) * 90);
        await db.update(schema.backups)
          .set({ progress })
          .where(eq(schema.backups.id, job.id));
      }

      await archive.finalize();
      await archiveFinished;

      const zipBuffer = Buffer.concat(chunks);
      console.log(`[backup-worker] ZIP created: ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB`);

      await db.update(schema.backups)
        .set({ progress: 95 })
        .where(eq(schema.backups.id, job.id));

      const [site] = job.siteId
        ? await db.select().from(schema.sites).where(eq(schema.sites.id, job.siteId))
        : [null];

      let uploadFolderId: string;
      if (site?.driveFolderId) {
        uploadFolderId = await ensureSubfolder(site.driveFolderId, "Backup");
      } else {
        const sharedFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!sharedFolder) throw new Error("No Drive folder configured");
        uploadFolderId = await ensureSubfolder(sharedFolder, "Backup");
      }

      const now = new Date();
      const zipName = `backup_${now.toISOString().slice(0, 10)}_${job.id.slice(0, 8)}.zip`;
      const result = await uploadFile(uploadFolderId, zipName, zipBuffer, "application/zip");

      const downloadLink = await getFileWebViewLink(result.fileId);

      const expiresAt = new Date();
      const [sched] = await db.select().from(schema.backupSchedules).where(eq(schema.backupSchedules.userId, job.userId));
      expiresAt.setDate(expiresAt.getDate() + (sched?.retentionDays ?? 180));

      await db.update(schema.backups)
        .set({
          status: "completed",
          progress: 100,
          sizeBytes: zipBuffer.length,
          videoCount: driveVideos.length,
          driveFileId: result.fileId,
          downloadLink,
          finishedAt: new Date(),
          expiresAt,
        })
        .where(eq(schema.backups.id, job.id));

      console.log(`[backup-worker] Backup ${job.id} completed (${driveVideos.length} videos, ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

    } catch (err) {
      console.error(`[backup-worker] Backup ${job.id} failed:`, err);
      await db.update(schema.backups)
        .set({ status: "failed", error: String(err), finishedAt: new Date() })
        .where(eq(schema.backups.id, job.id));
    }
  } catch (err) {
    console.error("[backup-worker] Error:", err);
  }
}

async function processScheduledBackups() {
  try {
    const now = new Date();
    const dueSchedules = await db.select()
      .from(schema.backupSchedules)
      .where(and(
        eq(schema.backupSchedules.enabled, true),
        lte(schema.backupSchedules.nextRunAt, now),
      ));

    for (const schedule of dueSchedules) {
      await db.insert(schema.backups).values({
        userId: schedule.userId,
        siteId: schedule.siteId,
        trigger: "scheduled",
        status: "queued",
        progress: 0,
        videoCount: 0,
      });

      const nextRun = new Date(now);
      nextRun.setMonth(nextRun.getMonth() + schedule.intervalMonths);

      await db.update(schema.backupSchedules)
        .set({ nextRunAt: nextRun, updatedAt: new Date() })
        .where(eq(schema.backupSchedules.userId, schedule.userId));

      console.log(`[backup-worker] Scheduled backup queued for user ${schedule.userId}, next run: ${nextRun.toISOString()}`);
    }
  } catch (err) {
    console.error("[backup-worker] Schedule check error:", err);
  }
}

export function startBackupWorker() {
  console.log(`[backup-worker] Background worker started (interval: ${POLL_INTERVAL / 1000}s)`);
  setInterval(async () => {
    await processScheduledBackups();
    await processQueuedBackups();
  }, POLL_INTERVAL);
  setTimeout(async () => {
    await processScheduledBackups();
    await processQueuedBackups();
  }, 5000);
}

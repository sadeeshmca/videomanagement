import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
  }
  const redirectUri = `${process.env.APP_URL || "http://localhost:3001"}/api/auth/google/callback`;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
}

export async function handleCallback(code: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  await db.insert(schema.appSettings).values({
    key: "google_drive_tokens",
    value: tokens,
  }).onConflictDoUpdate({
    target: schema.appSettings.key,
    set: { value: tokens },
  });
}

async function getTokens(): Promise<{ access_token: string; refresh_token: string; expiry_date?: number } | null> {
  const [row] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, "google_drive_tokens"));
  return row ? (row.value as any) : null;
}

async function getAuthedDrive(): Promise<drive_v3.Drive> {
  const tokens = await getTokens();
  if (!tokens) throw new Error("Google Drive not connected. Please connect via Settings.");
  const client = getOAuth2Client();
  client.setCredentials(tokens);

  client.on("tokens", async (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    await db.insert(schema.appSettings).values({
      key: "google_drive_tokens",
      value: merged,
    }).onConflictDoUpdate({
      target: schema.appSettings.key,
      set: { value: merged },
    });
  });

  return google.drive({ version: "v3", auth: client });
}

export async function isDriveConnected(): Promise<boolean> {
  const tokens = await getTokens();
  return !!tokens?.refresh_token;
}

export async function ensureSiteFolder(siteName: string, existingFolderId?: string | null): Promise<string> {
  const sharedFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (sharedFolder) return sharedFolder;

  const drive = await getAuthedDrive();

  if (existingFolderId) {
    try {
      const res = await drive.files.get({ fileId: existingFolderId, fields: "id,trashed" });
      if (res.data.id && !res.data.trashed) return existingFolderId;
    } catch {}
  }

  const res = await drive.files.create({
    requestBody: {
      name: siteName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return res.data.id!;
}

export async function uploadFile(
  folderId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = await getAuthedDrive();

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,webViewLink",
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink!,
  };
}

export async function makePublic(fileId: string): Promise<void> {
  const drive = await getAuthedDrive();
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });
}

export async function makePrivate(fileId: string): Promise<void> {
  const drive = await getAuthedDrive();
  const res = await drive.permissions.list({ fileId });
  const anyonePerms = res.data.permissions?.filter((p) => p.type === "anyone") ?? [];
  for (const perm of anyonePerms) {
    if (perm.id) {
      await drive.permissions.delete({ fileId, permissionId: perm.id });
    }
  }
}

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

export async function ensureMonthFolder(parentFolderId: string, date?: Date): Promise<string> {
  const d = date ?? new Date();
  const monthName = d.toLocaleString("en-US", { month: "long", year: "numeric" });
  const drive = await getAuthedDrive();

  const search = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${monthName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    spaces: "drive",
  });

  if (search.data.files?.length) {
    return search.data.files[0].id!;
  }

  const res = await drive.files.create({
    requestBody: {
      name: monthName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return res.data.id!;
}

export async function ensureSubfolder(parentFolderId: string, folderName: string): Promise<string> {
  const drive = await getAuthedDrive();

  const search = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    spaces: "drive",
  });

  if (search.data.files?.length) {
    return search.data.files[0].id!;
  }

  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return res.data.id!;
}

export async function moveFileToFolder(fileId: string, newFolderId: string): Promise<void> {
  const drive = await getAuthedDrive();

  const file = await drive.files.get({ fileId, fields: "parents" });
  const previousParents = file.data.parents?.join(",") ?? "";

  await drive.files.update({
    fileId,
    addParents: newFolderId,
    removeParents: previousParents,
    fields: "id,parents",
  });
}

export async function listFilesInFolder(folderId: string): Promise<{ id: string; name: string }[]> {
  const drive = await getAuthedDrive();
  const files: { id: string; name: string }[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name)",
      spaces: "drive",
      pageSize: 100,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (f.id && f.name) files.push({ id: f.id, name: f.name });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export async function listSubfolders(parentFolderId: string): Promise<{ id: string; name: string }[]> {
  const drive = await getAuthedDrive();
  const folders: { id: string; name: string }[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "nextPageToken,files(id,name)",
      spaces: "drive",
      pageSize: 100,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (f.id && f.name) folders.push({ id: f.id, name: f.name });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return folders;
}

export async function downloadFileStream(fileId: string): Promise<NodeJS.ReadableStream> {
  const drive = await getAuthedDrive();
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  return res.data as unknown as NodeJS.ReadableStream;
}

export async function getFileWebViewLink(fileId: string): Promise<string> {
  const drive = await getAuthedDrive();
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });
  const res = await drive.files.get({ fileId, fields: "webViewLink" });
  return res.data.webViewLink!;
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

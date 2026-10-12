import { pgTable, pgEnum, uuid, text, bigint, boolean, timestamptz, date, integer, jsonb, index, unique, serial } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["super_admin", "admin", "user"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  driveFolderId: text("drive_folder_id"),
  quotaBytes: bigint("quota_bytes", { mode: "number" }).notNull().default(107374182400),
  status: text("status").notNull().default("active"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => users.id),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
  suspended: boolean("suspended").notNull().default(false),
  quotaBytes: bigint("quota_bytes", { mode: "number" }).notNull().default(10737418240),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: appRoleEnum("role").notNull(),
}, (t) => [
  unique().on(t.userId, t.role),
]);

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  orderId: text("order_id").notNull(),
  sku: text("sku"),
  customerPhone: text("customer_phone"),
  title: text("title").notNull(),
  tags: text("tags").array().notNull().default([]),
  driveFileId: text("drive_file_id"),
  driveWebViewLink: text("drive_web_view_link"),
  thumbnailUrl: text("thumbnail_url"),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  isPublic: boolean("is_public").notNull().default(false),
  status: text("status").notNull().default("ready"),
  orderDate: date("order_date").notNull().defaultNow(),
  deletedAt: timestamptz("deleted_at"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (t) => [
  index("videos_site_created_idx").on(t.siteId, t.createdAt),
  index("videos_order_idx").on(t.siteId, t.orderId),
  index("videos_owner_idx").on(t.ownerId),
  index("videos_deleted_idx").on(t.deletedAt),
]);

export const uploadUsage = pgTable("upload_usage", {
  day: date("day").primaryKey(),
  bytes: bigint("bytes", { mode: "number" }).notNull().default(0),
});

export const backupSchedules = pgTable("backup_schedules", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "cascade" }),
  intervalMonths: integer("interval_months").notNull().default(3),
  startDate: date("start_date").notNull().defaultNow(),
  nextRunAt: timestamptz("next_run_at").notNull().defaultNow(),
  retentionDays: integer("retention_days").notNull().default(180),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const backups = pgTable("backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "cascade" }),
  trigger: text("trigger").notNull().default("manual"),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  videoCount: integer("video_count").notNull().default(0),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  driveFileId: text("drive_file_id"),
  downloadLink: text("download_link"),
  error: text("error"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  finishedAt: timestamptz("finished_at"),
  expiresAt: timestamptz("expires_at"),
}, (t) => [
  index("backups_user_idx").on(t.userId, t.createdAt),
]);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: uuid("actor_id"),
  siteId: uuid("site_id"),
  action: text("action").notNull(),
  target: text("target"),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (t) => [
  index("audit_created_idx").on(t.createdAt),
]);

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  status: text("status").notNull().default("queued"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

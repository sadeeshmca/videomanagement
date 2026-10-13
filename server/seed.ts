import bcrypt from "bcryptjs";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

async function seed() {
  console.log("Seeding database...");

  // Clear existing data in reverse dependency order
  await db.delete(schema.broadcasts);
  await db.delete(schema.auditLogs);
  await db.delete(schema.backups);
  await db.delete(schema.backupSchedules);
  await db.delete(schema.uploadUsage);
  await db.delete(schema.videos);
  await db.delete(schema.userRoles);
  await db.delete(schema.profiles);
  await db.delete(schema.users);
  await db.delete(schema.sites);
  await db.delete(schema.appSettings);

  // Sites
  const [site] = await db.insert(schema.sites).values({
    name: "Northwind Store",
    slug: "northwind",
    quotaBytes: 200 * GB,
    status: "active",
  }).returning();
  console.log(`  Site: ${site.name} (${site.id})`);

  // Users
  const passwordHash = await bcrypt.hash("password123", 10);

  const usersData = [
    { email: "priya@platform.example", fullName: "Priya Raman", role: "super_admin" as const },
    { email: "arjun@northwind.example", fullName: "Arjun Mehta", role: "admin" as const },
    { email: "lena@northwind.example", fullName: "Lena Ortiz", role: "admin" as const },
    { email: "sam@northwind.example", fullName: "Sam Okafor", role: "admin" as const },
  ];

  const createdUsers: Array<{ id: string; email: string; fullName: string; role: string; suspended: boolean }> = [];

  for (const u of usersData) {
    const [user] = await db.insert(schema.users).values({
      email: u.email,
      passwordHash,
    }).returning();

    const suspended = u.email === "sam@northwind.example";
    const quotaBytes = u.role === "super_admin" ? 50 * GB : u.email === "sam@northwind.example" ? 10 * GB : 20 * GB;

    await db.insert(schema.profiles).values({
      id: user.id,
      email: u.email,
      fullName: u.fullName,
      siteId: site.id,
      suspended,
      quotaBytes,
    });

    await db.insert(schema.userRoles).values({
      userId: user.id,
      role: u.role,
    });

    createdUsers.push({ id: user.id, email: u.email, fullName: u.fullName, role: u.role, suspended });
    console.log(`  User: ${u.fullName} (${u.role})${suspended ? " [suspended]" : ""}`);
  }

  // Videos (36 videos matching demo-store seed)
  const skus = ["TSHIRT-M", "MUG-01", "SHOE-42", "BAG-XL", "LAMP-02"];
  const adminUsers = createdUsers.filter((u) => u.role !== "super_admin");

  for (let i = 0; i < 36; i++) {
    const owner = adminUsers[i % 3];
    const day = String(28 - (i % 27)).padStart(2, "0");
    await db.insert(schema.videos).values({
      siteId: site.id,
      ownerId: owner.id,
      orderId: `ORD-${10420 + i}`,
      sku: skus[i % skus.length],
      customerPhone: `+9198765${String(43000 + i * 7).padStart(5, "0")}`,
      title: `Packing video ${10420 + i}`,
      tags: i % 4 === 0 ? ["fragile"] : [],
      sizeBytes: (40 + ((i * 37) % 260)) * MB,
      isPublic: i % 3 === 0,
      orderDate: `2026-09-${day}`,
      deletedAt: i % 11 === 5 ? new Date("2026-09-20T09:00:00Z") : null,
    });
  }
  console.log("  36 videos created");

  // Backups
  const arjun = createdUsers.find((u) => u.email === "arjun@northwind.example")!;
  const lena = createdUsers.find((u) => u.email === "lena@northwind.example")!;

  await db.insert(schema.backups).values([
    { userId: arjun.id, siteId: site.id, trigger: "manual", status: "running", progress: 45, videoCount: 12, sizeBytes: 0, createdAt: new Date("2026-09-27T09:00:00Z") },
    { userId: arjun.id, siteId: site.id, trigger: "scheduled", status: "completed", progress: 100, videoCount: 118, sizeBytes: Math.round(14.2 * GB), createdAt: new Date("2026-06-27T02:00:00Z"), expiresAt: new Date("2026-12-24T02:00:00Z") },
    { userId: lena.id, siteId: site.id, trigger: "scheduled", status: "failed", progress: 30, videoCount: 0, sizeBytes: 0, createdAt: new Date("2026-06-01T02:00:00Z") },
    { userId: arjun.id, siteId: site.id, trigger: "scheduled", status: "expired", progress: 100, videoCount: 90, sizeBytes: Math.round(9.8 * GB), createdAt: new Date("2026-03-27T02:00:00Z"), expiresAt: new Date("2026-09-23T02:00:00Z") },
  ]);
  console.log("  4 backups created");

  // Backup schedule
  await db.insert(schema.backupSchedules).values({
    userId: arjun.id,
    siteId: site.id,
    intervalMonths: 3,
    startDate: "2026-06-27",
    retentionDays: 180,
    enabled: true,
  });
  console.log("  Backup schedule created");

  // Audit logs
  const priya = createdUsers.find((u) => u.email === "priya@platform.example")!;
  const auditEntries = [
    { actorId: arjun.id, siteId: site.id, action: "video.uploaded", target: "ORD-10420", createdAt: new Date("2026-09-27T10:00:00Z") },
    { actorId: priya.id, siteId: site.id, action: "admin.suspended", target: "sam@cedar.example", createdAt: new Date("2026-09-26T15:12:00Z") },
    { actorId: lena.id, siteId: site.id, action: "login", target: "", createdAt: new Date("2026-09-26T08:40:00Z") },
    { actorId: arjun.id, siteId: site.id, action: "video.deleted", target: "ORD-10425", createdAt: new Date("2026-09-20T09:00:00Z") },
    { actorId: priya.id, siteId: site.id, action: "site.created", target: "Northwind Store", createdAt: new Date("2026-09-02T11:00:00Z") },
    { actorId: priya.id, siteId: site.id, action: "login", target: "", createdAt: new Date("2026-09-02T10:58:00Z") },
  ];

  for (const entry of auditEntries) {
    await db.insert(schema.auditLogs).values(entry);
  }
  console.log("  6 audit log entries created");

  // App settings
  await db.insert(schema.appSettings).values({
    key: "daily_upload_cap_bytes",
    value: 805306368000,
  }).onConflictDoUpdate({
    target: schema.appSettings.key,
    set: { value: 805306368000 },
  });
  console.log("  App settings created");

  // Upload usage for today
  const today = new Date().toISOString().slice(0, 10);
  await db.insert(schema.uploadUsage).values({
    day: today,
    bytes: 182 * GB,
  }).onConflictDoUpdate({
    target: schema.uploadUsage.day,
    set: { bytes: 182 * GB },
  });
  console.log("  Upload usage seeded");

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

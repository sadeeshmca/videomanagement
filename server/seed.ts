import bcrypt from "bcryptjs";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";

const GB = 1024 ** 3;

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

  // App settings (required for daily upload cap)
  await db.insert(schema.appSettings).values({
    key: "daily_upload_cap_bytes",
    value: 805306368000,
  }).onConflictDoUpdate({
    target: schema.appSettings.key,
    set: { value: 805306368000 },
  });
  console.log("  App settings created");

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

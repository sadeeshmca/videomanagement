import { Router } from "express";
import { eq, sql, desc, count as drizzleCount } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/api/audit", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    const baseCondition = q
      ? sql`(${schema.auditLogs.action} ilike ${`%${q}%`} or ${schema.auditLogs.target} ilike ${`%${q}%`} or ${schema.profiles.fullName} ilike ${`%${q}%`})`
      : undefined;

    const [{ count: total }] = await db
      .select({ count: drizzleCount() })
      .from(schema.auditLogs)
      .leftJoin(schema.profiles, eq(schema.auditLogs.actorId, schema.profiles.id))
      .where(baseCondition);

    const rows = await db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        target: schema.auditLogs.target,
        createdAt: schema.auditLogs.createdAt,
        actor: schema.profiles.fullName,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.profiles, eq(schema.auditLogs.actorId, schema.profiles.id))
      .where(baseCondition)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(page * limit);

    res.json({ rows, total: Number(total) });
  } catch (err) {
    console.error("Audit list error:", err);
    res.status(500).json({ error: "Failed to load audit log" });
  }
});

export default router;

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { requireAuth, isSuperAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/api/sites", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const superAdmin = await isSuperAdmin(userId);

    if (superAdmin) {
      const rows = await db.select().from(schema.sites);
      res.json(rows);
    } else {
      const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
      if (profile?.siteId) {
        const [site] = await db.select().from(schema.sites).where(eq(schema.sites.id, profile.siteId));
        res.json(site ? [site] : []);
      } else {
        res.json([]);
      }
    }
  } catch (err) {
    console.error("Sites list error:", err);
    res.status(500).json({ error: "Failed to load sites" });
  }
});

export default router;

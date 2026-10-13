import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

router.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      res.status(400).json({ error: "email, password, and fullName are required" });
      return;
    }

    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db.insert(schema.users).values({ email, passwordHash }).returning();

    await db.insert(schema.profiles).values({
      id: user.id,
      email,
      fullName,
    });

    await db.insert(schema.userRoles).values({
      userId: user.id,
      role: "admin",
    });

    const token = await signToken(user.id, email);

    res.status(201).json({
      token,
      user: { id: user.id, email, fullName, role: "admin" },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, user.id));
    const roles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
    const role = roles.find((r) => r.role === "super_admin") ? "super_admin" : roles[0]?.role ?? "user";

    const token = await signToken(user.id, email);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: profile?.fullName ?? email.split("@")[0],
        role,
        siteId: profile?.siteId ?? null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;

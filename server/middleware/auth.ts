import type { Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

export interface AuthUser {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const secret = () => {
  const key = process.env["JWT_SECRET"];
  if (!key) throw new Error("Missing JWT_SECRET environment variable");
  return new TextEncoder().encode(key);
};

export async function signToken(userId: string, email: string) {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as { sub: string; email: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const claims = await verifyToken(token);
    if (!claims.sub) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = { userId: claims.sub, email: claims.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const row = await db
    .select()
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId))
    .then((rows) => rows.find((r) => r.role === "super_admin"));
  return !!row;
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const isAdmin = await isSuperAdmin(req.user.userId);
  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden: super_admin role required" });
    return;
  }
  next();
}

export async function logAudit(actorId: string | null, siteId: string | null, action: string, target?: string, meta?: Record<string, unknown>) {
  await db.insert(schema.auditLogs).values({
    actorId,
    siteId,
    action,
    target: target ?? null,
    meta: meta ?? {},
  });
}

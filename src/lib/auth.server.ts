import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { SignJWT, jwtVerify } from "jose";

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

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No valid authorization header");
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const claims = await verifyToken(token);
    if (!claims.sub) {
      throw new Error("Unauthorized: No user ID found in token");
    }

    return next({
      context: {
        userId: claims.sub,
        email: claims.email,
      },
    });
  },
);

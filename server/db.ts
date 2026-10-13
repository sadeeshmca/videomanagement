import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema.js";

const connectionString = process.env["DATABASE_URL"] || process.env["DATABASE_PRIVATE_URL"] || process.env["DATABASE_PUBLIC_URL"];
if (!connectionString) {
  console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("PG") || k.includes("POSTGRES")).join(", ") || "(none matching)");
  throw new Error("Missing DATABASE_URL environment variable");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

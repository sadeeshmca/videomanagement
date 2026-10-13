import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema.js";

let _db: PostgresJsDatabase<typeof schema> | null = null;

export function getDb() {
  if (_db) return _db;
  const connectionString = process.env["DATABASE_URL"] || process.env["DATABASE_PRIVATE_URL"] || process.env["DATABASE_PUBLIC_URL"];
  if (!connectionString) {
    console.error("DATABASE_URL not found. Available env vars with DB/PG:", Object.keys(process.env).filter(k => /database|postgres|pg/i.test(k)));
    throw new Error("Missing DATABASE_URL environment variable");
  }
  const client = postgres(connectionString);
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

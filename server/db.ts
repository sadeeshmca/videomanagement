import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema.js";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

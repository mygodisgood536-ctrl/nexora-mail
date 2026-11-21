import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[Nexora] DATABASE_URL is not set. Database operations will fail until configured."
  );
}

const sql = connectionString ? neon(connectionString) : null;

export const db = (sql
  ? drizzle(sql, { schema })
  : null) as unknown as NeonHttpDatabase<typeof schema>;

export { schema };

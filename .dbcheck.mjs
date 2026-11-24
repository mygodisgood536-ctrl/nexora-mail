import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
const raw = fs.readFileSync(process.argv[2], "utf8");
let url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))?.slice(13)?.trim();
if (url?.startsWith('"') && url?.endsWith('"')) url = url.slice(1, -1);
const sql = neon(url);
const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
console.log("TABLES=" + t.map((r) => r.table_name).join(","));
const c = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`;
console.log("USER_COLS=" + c.map((r) => r.column_name).join(","));
try {
  const m = await sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`;
  console.log("MIGRATIONS=" + m.length);
} catch {
  console.log("MIGRATIONS=none");
}

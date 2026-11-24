import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
const raw = fs.readFileSync(process.argv[2], "utf8");
let url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))?.slice(13)?.trim();
if (url?.startsWith('"') && url?.endsWith('"')) url = url.slice(1, -1);
const sql = neon(url);
await sql`DELETE FROM rate_limits`;
console.log("RATE_LIMITS_CLEARED");

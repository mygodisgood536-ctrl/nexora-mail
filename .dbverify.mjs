import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
const raw = fs.readFileSync(process.argv[2], "utf8");
let url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))?.slice(13)?.trim();
if (url?.startsWith('"') && url?.endsWith('"')) url = url.slice(1, -1);
const sql = neon(url);
const rows = await sql`SELECT username, full_name, registration_status, totp_enabled,
  (password_hash IS NOT NULL AND password_hash <> '') AS has_password_hash,
  (totp_secret_encrypted IS NOT NULL) AS has_encrypted_totp
  FROM users WHERE username LIKE 'probe%' ORDER BY created_at DESC LIMIT 3`;
for (const r of rows) {
  console.log(`USER ${r.username} name=${r.full_name} status=${r.registration_status} totp=${r.totp_enabled} hash=${r.has_password_hash} encrypted_secret=${r.has_encrypted_totp}`);
}
const codes = await sql`SELECT count(*)::int AS n FROM recovery_codes`;
console.log("RECOVERY_CODES=" + codes[0].n);
const challenges = await sql`SELECT count(*)::int AS n FROM auth_challenges`;
console.log("CHALLENGES=" + challenges[0].n);

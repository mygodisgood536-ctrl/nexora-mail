import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM users WHERE status = 'active') AS active_users,
        (SELECT count(*) FROM users) AS total_users,
        (SELECT count(*) FROM mailboxes) AS mailboxes,
        (SELECT count(*) FROM aliases WHERE status = 'active') AS active_aliases,
        (SELECT count(*) FROM aliases WHERE status = 'paused') AS paused_aliases,
        (SELECT count(*) FROM aliases WHERE status = 'deleted') AS retired_aliases,
        (SELECT count(*) FROM permanent_address_registry) AS reserved_addresses,
        (SELECT count(*) FROM messages WHERE processing_state = 'stored') AS stored_messages,
        (SELECT count(*) FROM messages WHERE processing_state = 'expired') AS expired_messages,
        (SELECT count(*) FROM messages WHERE processing_state = 'deleted') AS deleted_messages,
        (SELECT count(*) FROM messages WHERE processing_state = 'stored' AND expires_at <= NOW()) AS overdue_messages,
        (SELECT count(*) FROM inbound_events WHERE processing_state = 'pending') AS pending_events,
        (SELECT count(*) FROM inbound_events WHERE processing_state = 'failed') AS failed_events,
        (SELECT COALESCE(sum(size_bytes), 0) FROM messages WHERE processing_state = 'stored') AS stored_bytes
    `);
    const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
    return NextResponse.json({ overview: rows[0] ?? {} });
  } catch (err) {
    console.error("[admin/overview]", err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { mailboxes, usageCounters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.userId, session.user.id))
      .limit(1);

    const [usage] = await db
      .select()
      .from(usageCounters)
      .where(eq(usageCounters.userId, session.user.id))
      .orderBy(desc(usageCounters.period))
      .limit(1);

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: Boolean(session.user.emailVerifiedAt),
      },
      mailboxId: mailbox?.id ?? null,
      usage: usage ?? null,
    });
  } catch (err) {
    console.error("[auth/me]", err);
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}

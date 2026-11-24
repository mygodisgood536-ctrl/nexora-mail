import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { mailboxes, usageCounters, recoveryCodes } from "@/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const unusedRecoveryCodes = await db
      .select({ id: recoveryCodes.id })
      .from(recoveryCodes)
      .where(and(eq(recoveryCodes.userId, session.user.id), isNull(recoveryCodes.usedAt)));

    return NextResponse.json({
      user: {
        id: session.user.id,
        username: session.user.username,
        fullName: session.user.fullName,
        twoFactorEnabled: session.user.totpEnabled,
      },
      mailboxId: mailbox?.id ?? null,
      usage: usage ?? null,
      recoveryCodesRemaining: unusedRecoveryCodes.length,
    });
  } catch (err) {
    console.error("[auth/me]", err);
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}

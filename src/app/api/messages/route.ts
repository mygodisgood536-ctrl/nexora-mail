import { NextResponse } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { aliases, mailboxes, messages } from "@/db/schema";

export async function GET(req: Request) {
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

    if (!mailbox) {
      return NextResponse.json({ messages: [] });
    }

    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 100);

    const rows = await db
      .select({
        id: messages.id,
        fromName: messages.fromName,
        fromAddress: messages.fromAddress,
        subject: messages.subject,
        preview: messages.preview,
        receivedAt: messages.receivedAt,
        expiresAt: messages.expiresAt,
        isRead: messages.isRead,
        hasAttachments: messages.hasAttachments,
        aliasAddress: aliases.fullAddress,
      })
      .from(messages)
      .innerJoin(aliases, eq(messages.aliasId, aliases.id))
      .where(
        and(
          eq(messages.mailboxId, mailbox.id),
          eq(messages.processingState, "stored"),
          gt(messages.expiresAt, new Date())
        )
      )
      .orderBy(desc(messages.receivedAt))
      .limit(limit);

    return NextResponse.json({ messages: rows });
  } catch (err) {
    console.error("[messages GET]", err);
    return NextResponse.json(
      { error: "Mailbox service is unavailable" },
      { status: 503 }
    );
  }
}

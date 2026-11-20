import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { messages, aliases, mailboxes } from "@/db/schema";
import { eq, and, desc, ne } from "drizzle-orm";

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

    if (!mailbox) {
      return NextResponse.json({ messages: [] });
    }

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
          ne(messages.processingState, "deleted"),
          ne(messages.processingState, "expired")
        )
      )
      .orderBy(desc(messages.receivedAt))
      .limit(100);

    return NextResponse.json({ messages: rows });
  } catch (err) {
    console.error("[messages GET]", err);
    return NextResponse.json({ messages: [] });
  }
}

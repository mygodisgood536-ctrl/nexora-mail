import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { messages, mailboxes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.userId, session.user.id))
      .limit(1);

    if (!mailbox) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .update(messages)
      .set({ isRead: body.isRead ?? true })
      .where(and(eq(messages.id, id), eq(messages.mailboxId, mailbox.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[messages PATCH]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.userId, session.user.id))
      .limit(1);

    if (!mailbox) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .update(messages)
      .set({ processingState: "deleted" })
      .where(and(eq(messages.id, id), eq(messages.mailboxId, mailbox.id)));

    // TODO: also delete R2 object when storage is connected

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[messages DELETE]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

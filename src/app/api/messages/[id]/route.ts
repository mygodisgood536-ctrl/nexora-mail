import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { aliases, mailboxes, messages } from "@/db/schema";
import { deleteStoredObject, getStoredMessage } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

async function findOwnedMessage(id: string, userId: string) {
  const [mailbox] = await db
    .select()
    .from(mailboxes)
    .where(eq(mailboxes.userId, userId))
    .limit(1);
  if (!mailbox) return null;

  const [row] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), eq(messages.mailboxId, mailbox.id)))
    .limit(1);
  return row ?? null;
}

function sanitizeHtml(html: string | null): string | null {
  if (!html) return null;
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: [
      "script",
      "style",
      "form",
      "iframe",
      "object",
      "embed",
      "img",
      "svg",
      "math",
      "link",
      "meta",
      "base",
    ],
    ALLOWED_URI_REGEXP: /^(https?:\/\/|mailto:)/i,
  });
}

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const row = await findOwnedMessage(id, session.user.id);
    if (!row || row.processingState !== "stored") {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (row.expiresAt.getTime() <= Date.now() || !row.storageKey) {
      return NextResponse.json(
        { error: "Message content has expired" },
        { status: 410 }
      );
    }

    const payload = await getStoredMessage(row.storageKey);

    const [alias] = await db
      .select({ fullAddress: aliases.fullAddress })
      .from(aliases)
      .where(eq(aliases.id, row.aliasId))
      .limit(1);

    return NextResponse.json({
      id: row.id,
      subject: row.subject,
      fromName: row.fromName,
      fromAddress: row.fromAddress,
      aliasAddress: alias?.fullAddress ?? payload.recipient,
      receivedAt: row.receivedAt,
      expiresAt: row.expiresAt,
      hasAttachments: row.hasAttachments,
      text: payload.text,
      html: sanitizeHtml(payload.html),
      remoteImagesBlocked: true,
      attachments: payload.attachments ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "R2_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Message storage is not configured" },
        { status: 503 }
      );
    }
    console.error("[messages/[id] GET]", err);
    return NextResponse.json({ error: "Failed to load message" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = z.object({ isRead: z.boolean() }).safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const row = await findOwnedMessage(id, session.user.id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db
      .update(messages)
      .set({ isRead: parsed.data.isRead })
      .where(eq(messages.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[messages/[id] PATCH]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const row = await findOwnedMessage(id, session.user.id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let physicallyDeleted = false;
    try {
      await deleteStoredObject(row.storageKey);
      physicallyDeleted = true;
    } catch (err) {
      console.error("[messages/[id] DELETE] storage cleanup pending:", err);
    }

    await db
      .update(messages)
      .set({
        processingState: "deleted",
        storageKey: physicallyDeleted ? null : row.storageKey,
        preview: null,
        subject: null,
      })
      .where(eq(messages.id, id));

    await recordAudit({
      action: "message.deleted",
      userId: session.user.id,
      actorId: session.user.id,
      resourceType: "message",
      resourceId: id,
      metadata: { physicalCleanupPending: !physicallyDeleted },
    });

    return NextResponse.json({ success: true, physicallyDeleted });
  } catch (err) {
    console.error("[messages/[id] DELETE]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

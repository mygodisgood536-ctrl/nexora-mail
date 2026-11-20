import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { aliases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const schema = z.object({ status: z.enum(["active", "paused", "deleted"]) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  try {
    const updates: any = { status: parsed.data.status };
    if (parsed.data.status === "paused") updates.pausedAt = new Date();
    if (parsed.data.status === "deleted") updates.deletedAt = new Date();
    if (parsed.data.status === "active") updates.pausedAt = null;

    await db
      .update(aliases)
      .set(updates)
      .where(and(eq(aliases.id, id), eq(aliases.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

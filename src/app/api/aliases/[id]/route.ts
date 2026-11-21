import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { aliases, permanentAddressRegistry } from "@/db/schema";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

type AliasStatus = "active" | "paused" | "deleted";

const transitions: Record<AliasStatus, AliasStatus[]> = {
  active: ["paused", "deleted"],
  paused: ["active", "deleted"],
  deleted: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (
      !(await rateLimitOrAllow(`alias-update:${session.user.id}`, 60, 60 * 60 * 1000))
    ) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const requested = body?.status as AliasStatus;
    if (!["active", "paused", "deleted"].includes(requested)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const [current] = await db
      .select()
      .from(aliases)
      .where(and(eq(aliases.id, id), eq(aliases.userId, session.user.id)))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Alias not found" }, { status: 404 });
    }

    const from = current.status as AliasStatus;
    if (!transitions[from].includes(requested)) {
      return NextResponse.json(
        {
          error:
            from === "deleted"
              ? "A retired alias cannot be changed or reactivated"
              : "Invalid status transition",
        },
        { status: 409 }
      );
    }

    const updates: Record<string, unknown> = { status: requested };
    if (requested === "paused") updates.pausedAt = new Date();
    if (requested === "active") updates.pausedAt = null;
    if (requested === "deleted") updates.deletedAt = new Date();

    await db
      .update(aliases)
      .set(updates)
      .where(and(eq(aliases.id, id), eq(aliases.userId, session.user.id)));

    if (requested === "deleted") {
      await db
        .update(permanentAddressRegistry)
        .set({ terminalState: "retired" })
        .where(eq(permanentAddressRegistry.fullAddress, current.fullAddress));
    }

    await recordAudit({
      action: `alias.${requested}`,
      userId: session.user.id,
      actorId: session.user.id,
      resourceType: "alias",
      resourceId: id,
      metadata: { from, fullAddress: current.fullAddress },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ success: true, status: requested });
  } catch (err) {
    console.error("[aliases/[id] PATCH]", err);
    return NextResponse.json({ error: "Failed to update alias" }, { status: 500 });
  }
}

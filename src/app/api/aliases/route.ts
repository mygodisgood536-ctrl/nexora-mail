import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { aliases, permanentAddressRegistry, mailboxes } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import {
  normalizeEmailLocalPart,
  isValidLocalPart,
  isReservedLocalPart,
} from "@/lib/utils";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || "nexora.mail";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(aliases)
      .where(
        and(
          eq(aliases.userId, session.user.id),
          ne(aliases.status, "deleted")
        )
      )
      .orderBy(aliases.createdAt);

    return NextResponse.json({ aliases: rows });
  } catch (err) {
    console.error("[aliases GET]", err);
    // Graceful empty when DB not connected
    return NextResponse.json({ aliases: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const schema = z.object({ localPart: z.string().min(1).max(64) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid local part" }, { status: 400 });
    }

    const local = normalizeEmailLocalPart(parsed.data.localPart);
    if (!isValidLocalPart(local)) {
      return NextResponse.json({ error: "Invalid alias format" }, { status: 400 });
    }
    if (isReservedLocalPart(local)) {
      return NextResponse.json({ error: "This name is reserved" }, { status: 400 });
    }

    const fullAddress = `${local}@${PLATFORM_DOMAIN}`;

    // Check permanent registry
    const existing = await db
      .select()
      .from(permanentAddressRegistry)
      .where(eq(permanentAddressRegistry.fullAddress, fullAddress))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "This address is already reserved and cannot be used" },
        { status: 409 }
      );
    }

    // Get mailbox
    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.userId, session.user.id))
      .limit(1);

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found" }, { status: 500 });
    }

    // Transaction-like: registry first then alias
    await db.insert(permanentAddressRegistry).values({
      fullAddress,
      localPart: local,
      domain: PLATFORM_DOMAIN,
      ownerUserId: session.user.id,
      terminalState: "active",
      everReserved: true,
    });

    const [alias] = await db
      .insert(aliases)
      .values({
        mailboxId: mailbox.id,
        userId: session.user.id,
        localPart: local,
        domain: PLATFORM_DOMAIN,
        fullAddress,
        status: "active",
        permanent: true,
      })
      .returning();

    return NextResponse.json({ alias }, { status: 201 });
  } catch (err: any) {
    console.error("[aliases POST]", err);
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "This address is already reserved" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create alias. Ensure database is configured." },
      { status: 500 }
    );
  }
}

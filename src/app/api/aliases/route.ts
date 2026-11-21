import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { aliases, mailboxes } from "@/db/schema";
import {
  platformDomain,
  randomLocalPart,
  suggestionsFor,
  validateLocalPart,
} from "@/lib/aliases";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const schema = z.object({
  localPart: z.string().max(64).optional(),
  mode: z.enum(["custom", "random"]).default("custom"),
});

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
        and(eq(aliases.userId, session.user.id), ne(aliases.status, "deleted"))
      )
      .orderBy(aliases.createdAt);

    return NextResponse.json({ aliases: rows });
  } catch (err) {
    console.error("[aliases GET]", err);
    return NextResponse.json(
      { error: "Alias service is unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (
      !(await rateLimitOrAllow(`alias-create:${session.user.id}`, 30, 60 * 60 * 1000))
    ) {
      return NextResponse.json(
        { error: "Alias creation limit reached. Please try again later." },
        { status: 429 }
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const domain = platformDomain();
    const attempts: string[] = [];

    if (parsed.data.mode === "random") {
      for (let i = 0; i < 5; i += 1) {
        attempts.push(randomLocalPart());
      }
    } else {
      if (!parsed.data.localPart) {
        return NextResponse.json({ error: "Invalid alias format" }, { status: 400 });
      }
      const validated = validateLocalPart(parsed.data.localPart);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      attempts.push(validated.localPart);
    }

    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.userId, session.user.id))
      .limit(1);

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found" }, { status: 500 });
    }

    for (const localPart of attempts) {
      const fullAddress = `${localPart}@${domain}`;

      const result = await db.execute(sql`
        WITH reserved AS (
          INSERT INTO permanent_address_registry
            (full_address, local_part, domain, owner_user_id, terminal_state, ever_reserved, first_committed_at)
          VALUES (${fullAddress}, ${localPart}, ${domain}, ${session.user.id}, 'active', true, NOW())
          ON CONFLICT (full_address) DO NOTHING
          RETURNING id
        )
        INSERT INTO aliases
          (mailbox_id, user_id, local_part, domain, full_address, status, permanent, created_at)
        SELECT ${mailbox.id}, ${session.user.id}, ${localPart}, ${domain}, ${fullAddress}, 'active', true, NOW()
        FROM reserved
        RETURNING id, full_address, local_part, domain, status, created_at, message_count
      `);

      const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
      if (rows.length > 0) {
        await recordAudit({
          action: "alias.created",
          userId: session.user.id,
          actorId: session.user.id,
          resourceType: "alias",
          resourceId: String(rows[0].id),
          metadata: { fullAddress },
          ipAddress: clientIp(req),
        });
        return NextResponse.json({ alias: rows[0] }, { status: 201 });
      }
    }

    const seed = parsed.data.mode === "random" ? "" : parsed.data.localPart || "";
    return NextResponse.json(
      {
        error: "This address is already reserved and cannot be used",
        suggestions: suggestionsFor(seed),
      },
      { status: 409 }
    );
  } catch (err) {
    console.error("[aliases POST]", err);
    return NextResponse.json(
      { error: "Failed to create alias. Check server configuration." },
      { status: 500 }
    );
  }
}

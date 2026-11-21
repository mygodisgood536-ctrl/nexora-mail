import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { permanentAddressRegistry } from "@/db/schema";
import { platformDomain, suggestionsFor, validateLocalPart } from "@/lib/aliases";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (
      !(await checkRateLimit(
        `alias-availability:${session.user.id}`,
        120,
        60 * 1000
      ))
    ) {
      return NextResponse.json(
        { error: "Too many checks. Please slow down." },
        { status: 429 }
      );
    }

    const raw = req.nextUrl.searchParams.get("localPart") || "";
    const validated = validateLocalPart(raw);
    if (!validated.ok) {
      return NextResponse.json({ available: false, reason: validated.error });
    }

    const fullAddress = `${validated.localPart}@${platformDomain()}`;
    const [existing] = await db
      .select({ id: permanentAddressRegistry.id })
      .from(permanentAddressRegistry)
      .where(eq(permanentAddressRegistry.fullAddress, fullAddress))
      .limit(1);

    if (existing) {
      return NextResponse.json({
        available: false,
        reason: "This address is already reserved",
        suggestions: suggestionsFor(validated.localPart),
      });
    }

    return NextResponse.json({
      available: true,
      localPart: validated.localPart,
      fullAddress,
    });
  } catch (err) {
    console.error("[aliases/availability]", err);
    return NextResponse.json(
      { error: "Availability service is unavailable" },
      { status: 503 }
    );
  }
}

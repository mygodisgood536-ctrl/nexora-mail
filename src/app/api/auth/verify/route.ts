import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeVerificationToken } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ token: z.string().min(10).max(128) });

export async function POST(req: NextRequest) {
  try {
    if (!(await checkRateLimit(`verify:${clientIp(req)}`, 10, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const userId = await consumeVerificationToken(parsed.data.token);
    await recordAudit({
      action: "account.email_verified",
      userId,
      actorId: userId,
      resourceType: "user",
      resourceId: userId,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_TOKEN") {
      return NextResponse.json(
        { error: "This verification link is invalid, expired, or already used" },
        { status: 400 }
      );
    }
    console.error("[verify]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

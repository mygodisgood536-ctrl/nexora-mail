import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyLoginChallenge, createSession } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ challengeToken: z.string().min(10), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitOrAllow(`2fa:${clientIp(req)}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid 6-digit code" }, { status: 400 });
    }
    const user = await verifyLoginChallenge(parsed.data.challengeToken, parsed.data.code);
    await createSession(user.id, clientIp(req), req.headers.get("user-agent") || undefined);
    await recordAudit({
      action: "account.login",
      userId: user.id,
      actorId: user.id,
      resourceType: "user",
      resourceId: user.id,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ success: true, username: user.username });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_CODE") {
      return NextResponse.json({ error: "Incorrect or expired code" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid or expired verification request" }, { status: 400 });
  }
}

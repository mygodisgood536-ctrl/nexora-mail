import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEnrollment } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ token: z.string().min(10), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitOrAllow(`enroll:${clientIp(req)}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid 6-digit code" }, { status: 400 });
    }
    const result = await verifyEnrollment(parsed.data.token, parsed.data.code);
    await recordAudit({
      action: "account.authenticator_enabled",
      resourceType: "user",
      resourceId: result.username,
    });
    return NextResponse.json({ success: true, username: result.username });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_CODE") {
      return NextResponse.json({ error: "That code is incorrect or expired" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid or expired enrollment link" }, { status: 400 });
  }
}

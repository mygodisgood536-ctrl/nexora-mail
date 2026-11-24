import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recoverWithCode } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ username: z.string().min(1), code: z.string().min(6) });

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitOrAllow(`recovery:${clientIp(req)}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Username and recovery code are required" }, { status: 400 });
    const result = await recoverWithCode(parsed.data.username, parsed.data.code);
    await recordAudit({ action: "account.recovery_code_used", resourceType: "user" });
    return NextResponse.json({ success: true, enrollmentToken: result.enrollmentToken });
  } catch {
    return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
  }
}

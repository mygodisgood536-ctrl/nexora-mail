import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPasswordResetChallenge } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";

const schema = z.object({ challengeToken: z.string().min(10), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitOrAllow(`forgot-verify:${clientIp(req)}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid 6-digit code" }, { status: 400 });
    const result = await verifyPasswordResetChallenge(parsed.data.challengeToken, parsed.data.code);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_CODE") return NextResponse.json({ error: "Incorrect or expired code" }, { status: 400 });
    return NextResponse.json({ error: "Invalid or expired request" }, { status: 400 });
  }
}

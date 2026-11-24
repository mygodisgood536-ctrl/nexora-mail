import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitOrAllow(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const body = await req.json();
    if (typeof body?.username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    const result = await requestPasswordReset(body.username);
    return NextResponse.json({ challengeToken: result.challengeToken });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

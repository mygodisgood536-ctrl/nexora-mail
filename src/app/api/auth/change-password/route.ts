import { NextRequest, NextResponse } from "next/server";
import { getSession, requestPasswordChange, changePassword, validatePassword } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (!body?.code) {
    if (!(await rateLimitOrAllow(`change:${session.user.id}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    const result = await requestPasswordChange(session.user.id);
    return NextResponse.json({ challengeToken: result.challengeToken });
  }

  try {
    if (
      typeof body.token !== "string" ||
      typeof body.code !== "string" ||
      !/^\d{6}$/.test(body.code)
    ) {
      return NextResponse.json({ error: "Enter a valid 6-digit code" }, { status: 400 });
    }
    const passCheck = validatePassword(body.newPassword ?? "");
    if (!passCheck.ok) return NextResponse.json({ error: passCheck.error }, { status: 400 });

    await changePassword(session.user.id, body.token, body.code, body.newPassword);
    await recordAudit({
      action: "account.password_changed",
      userId: session.user.id,
      actorId: session.user.id,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ success: true, signedOut: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_CODE") return NextResponse.json({ error: "Incorrect or expired code" }, { status: 400 });
    return NextResponse.json({ error: "Invalid or expired request" }, { status: 400 });
  }
}

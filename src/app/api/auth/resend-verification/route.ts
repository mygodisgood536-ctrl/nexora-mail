import { NextRequest, NextResponse } from "next/server";
import { getSession, createVerificationToken } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.emailVerifiedAt) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  try {
    if (
      !(await checkRateLimit(
        `verify-resend:${session.user.id}`,
        5,
        60 * 60 * 1000
      ))
    ) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const token = await createVerificationToken(session.user.id);
    const sent = await sendVerificationEmail(session.user.email, token);

    await recordAudit({
      action: "account.verification_resent",
      userId: session.user.id,
      actorId: session.user.id,
      resourceType: "user",
      resourceId: session.user.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ success: true, sent });
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}

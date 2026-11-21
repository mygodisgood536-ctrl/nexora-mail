import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  registerUser,
  createSession,
  createVerificationToken,
} from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!(await checkRateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, password, name } = parsed.data;
    const user = await registerUser(email, password, name);

    const token = await createVerificationToken(user.id);
    const emailSent = await sendVerificationEmail(user.email, token);

    await createSession(
      user.id,
      clientIp(req),
      req.headers.get("user-agent") || undefined
    );

    await recordAudit({
      action: "account.registered",
      userId: user.id,
      actorId: user.id,
      resourceType: "user",
      resourceId: user.id,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      verificationRequired: true,
      verificationEmailSent: emailSent,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

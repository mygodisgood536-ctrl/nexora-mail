import { NextRequest, NextResponse } from "next/server";
import { registerUser, validateFullName, validateUsername, validatePassword } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/db";

export async function POST(req: NextRequest) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }
  try {
    if (!(await rateLimitOrAllow(`register:${clientIp(req)}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const body = await req.json();
    const nameCheck = validateFullName(body?.fullName ?? "");
    if (!nameCheck.ok) return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    const userCheck = validateUsername(body?.username ?? "");
    if (!userCheck.ok) return NextResponse.json({ error: userCheck.error }, { status: 400 });
    const passCheck = validatePassword(body?.password ?? "");
    if (!passCheck.ok) return NextResponse.json({ error: passCheck.error }, { status: 400 });

    const result = await registerUser({
      fullName: nameCheck.fullName,
      username: userCheck.username,
      password: body.password,
    });

    await recordAudit({
      action: "account.registered",
      userId: result.user.id,
      actorId: result.user.id,
      resourceType: "user",
      resourceId: result.user.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(
      {
        success: true,
        enrollmentToken: result.enrollmentToken,
        recoveryCodes: result.recoveryCodesPlain,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "USERNAME_EXISTS") {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    if (message === "JWT_SECRET_MISSING") {
      return NextResponse.json({ error: "Server is missing JWT_SECRET." }, { status: 503 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed. Try again." }, { status: 500 });
  }
}

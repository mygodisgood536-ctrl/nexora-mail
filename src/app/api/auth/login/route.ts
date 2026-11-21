import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, createSession } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!(await checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000))) {
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

    const { email, password } = parsed.data;
    const user = await loginUser(email, password);
    await createSession(
      user.id,
      ip,
      req.headers.get("user-agent") || undefined
    );

    await recordAudit({
      action: "account.login",
      userId: user.id,
      actorId: user.id,
      resourceType: "user",
      resourceId: user.id,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_CREDENTIALS" || message === "ACCOUNT_SUSPENDED") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    console.error("[login]", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}

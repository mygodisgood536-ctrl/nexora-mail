import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, createSession } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/db";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  if (!isDbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL and run the migrations." },
      { status: 503 }
    );
  }

  try {
    if (!(await rateLimitOrAllow(`register:${clientIp(req)}`, 5, 60 * 60 * 1000))) {
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
    if (message === "JWT_SECRET_MISSING") {
      return NextResponse.json(
        { error: "Server is missing JWT_SECRET." },
        { status: 503 }
      );
    }
    if (message.includes("does not exist") || message.includes("42P01")) {
      return NextResponse.json(
        { error: "Database tables are missing. Run: npm run db:migrate" },
        { status: 503 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

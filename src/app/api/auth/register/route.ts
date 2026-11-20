import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, password, name } = parsed.data;
    const user = await registerUser(email, password, name);
    await createSession(
      user.id,
      req.headers.get("x-forwarded-for") || undefined,
      req.headers.get("user-agent") || undefined
    );

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err: any) {
    if (err.message === "EMAIL_EXISTS") {
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

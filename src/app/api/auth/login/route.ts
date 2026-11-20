import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await loginUser(email, password);
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
    if (err.message === "INVALID_CREDENTIALS" || err.message === "ACCOUNT_SUSPENDED") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    console.error("[login]", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}

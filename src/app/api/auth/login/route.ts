import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { rateLimitOrAllow, clientIp } from "@/lib/rate-limit";
import { isDbConfigured } from "@/db";

export async function POST(req: NextRequest) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }
  try {
    if (!(await rateLimitOrAllow(`login:${clientIp(req)}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const body = await req.json();
    if (typeof body?.username !== "string" || typeof body?.password !== "string") {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }
    const result = await loginUser(body.username, body.password);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_CREDENTIALS" || message === "ACCOUNT_SUSPENDED" || message === "ACCOUNT_LOCKED") {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
    console.error("[login]", err);
    return NextResponse.json({ error: "Sign in failed. Try again." }, { status: 500 });
  }
}

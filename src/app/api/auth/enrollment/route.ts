import { NextRequest, NextResponse } from "next/server";
import { getEnrollment } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing enrollment token" }, { status: 400 });
  try {
    const enrollment = await getEnrollment(token);
    return NextResponse.json(enrollment);
  } catch {
    return NextResponse.json({ error: "Invalid or expired enrollment link" }, { status: 400 });
  }
}

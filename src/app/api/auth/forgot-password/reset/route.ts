import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword, validatePassword } from "@/lib/auth";
import { destroySession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ resetToken: z.string().min(10), newPassword: z.string().min(10).max(128) });

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const passCheck = validatePassword(parsed.data.newPassword);
    if (!passCheck.ok) return NextResponse.json({ error: passCheck.error }, { status: 400 });
    await resetPassword(parsed.data.resetToken, parsed.data.newPassword);
    await destroySession();
    await recordAudit({ action: "account.password_reset", resourceType: "user" });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "CHALLENGE_NOT_VERIFIED" || message === "INVALID_CHALLENGE") {
      return NextResponse.json({ error: "Invalid or expired reset request" }, { status: 400 });
    }
    console.error("[forgot-password/reset]", err);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}

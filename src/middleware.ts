import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-secret-change-before-production-32chars"
);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("nexora_session")?.value;
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  if (!token) {
    return isApi
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return isApi
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/mailbox/:path*",
    "/aliases/:path*",
    "/settings/:path*",
    "/api/messages/:path*",
    "/api/aliases/:path*",
    "/api/admin/:path*",
  ],
};

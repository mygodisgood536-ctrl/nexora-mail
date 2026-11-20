import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions, mailboxes } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-in-production-32chars"
);
const COOKIE_NAME = "nexora_session";
const SESSION_DAYS = 14;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, ip?: string, ua?: string) {
  const token = nanoid(48);
  const tokenHash = await hashPassword(token); // simple hash for storage
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    ipAddress: ip,
    userAgent: ua,
  });

  const jwt = await new SignJWT({ sub: userId, jti: token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return jwt;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub as string;
    if (!userId) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, "active")))
      .limit(1);

    if (!user) return null;
    return { user };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function registerUser(email: string, password: string, name?: string) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      status: "active",
      emailVerifiedAt: null, // verify later
    })
    .returning();

  // Create the one mailbox
  await db.insert(mailboxes).values({
    userId: user.id,
    status: "active",
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.passwordHash) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.status !== "active") {
    throw new Error("ACCOUNT_SUSPENDED");
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return user;
}

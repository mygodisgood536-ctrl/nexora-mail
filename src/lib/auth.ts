import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "@/db";
import {
  users,
  sessions,
  mailboxes,
  emailVerificationTokens,
} from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const COOKIE_NAME = "nexora_session";
const SESSION_DAYS = 14;
const VERIFICATION_HOURS = 24;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set to at least 32 characters in production");
    }
    return new TextEncoder().encode("dev-only-secret-change-before-production-32chars");
  }
  return new TextEncoder().encode(secret);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
  const tokenHash = hashToken(token);
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
    .sign(getJwtSecret());

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
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId = payload.sub as string;
    const jti = payload.jti as string;
    if (!userId || !jti) return null;

    const [row] = await db
      .select({ user: users })
      .from(users)
      .innerJoin(sessions, eq(sessions.userId, users.id))
      .where(
        and(
          eq(users.id, userId),
          eq(users.status, "active"),
          eq(sessions.tokenHash, hashToken(jti)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!row) return null;
    return { user: row.user };
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
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      const jti = payload.jti as string;
      if (jti) {
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.tokenHash, hashToken(jti)));
      }
    } catch {
      // Invalid token — clearing the cookie below is sufficient.
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function revokeAllSessions(userId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export async function registerUser(email: string, password: string, name?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      name: name || null,
      status: "active",
      role: "user",
      emailVerifiedAt: null,
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    throw new Error("EMAIL_EXISTS");
  }

  await db
    .insert(mailboxes)
    .values({ userId: user.id, status: "active" })
    .onConflictDoNothing();

  return user;
}

export async function createVerificationToken(userId: string): Promise<string> {
  const token = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + VERIFICATION_HOURS);

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return token;
}

export async function consumeVerificationToken(token: string) {
  const tokenHash = hashToken(token);

  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (
    !row ||
    row.consumedAt ||
    row.expiresAt.getTime() <= Date.now()
  ) {
    throw new Error("INVALID_TOKEN");
  }

  await db
    .update(emailVerificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(emailVerificationTokens.tokenHash, tokenHash));

  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  return row.userId;
}

export async function loginUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
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

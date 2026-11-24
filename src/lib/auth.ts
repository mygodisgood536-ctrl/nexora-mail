import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import {
  users,
  sessions,
  mailboxes,
  authChallenges,
  recoveryCodes,
} from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  encryptSecret,
  hashCode,
  hashToken,
  randomToken,
} from "./crypto";
import { generateTotpSecret, verifyTotp } from "./totp";

const COOKIE_NAME = "nexora_session";
const SESSION_DAYS = 14;
const CHALLENGE_MINUTES = 10;
const RESERVED_USERNAMES = new Set([
  "admin", "root", "support", "help", "security", "noreply", "no-reply",
  "postmaster", "abuse", "system", "null", "undefined", "me", "api", "www",
]);

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET_MISSING");
    }
    return new TextEncoder().encode("dev-only-secret-change-before-production-32chars");
  }
  return new TextEncoder().encode(secret);
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string):
  | { ok: true; username: string }
  | { ok: false; error: string } {
  const username = normalizeUsername(value);
  if (username.length < 3 || username.length > 32) {
    return { ok: false, error: "Username must be 3–32 characters" };
  }
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(username)) {
    return { ok: false, error: "Use letters, numbers, dots, dashes or underscores" };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "This username is reserved" };
  }
  return { ok: true, username };
}

export function validateFullName(value: string):
  | { ok: true; fullName: string }
  | { ok: false; error: string } {
  const fullName = value.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 100) {
    return { ok: false, error: "Full name must be 2–100 characters" };
  }
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(fullName)) {
    return { ok: false, error: "Full name contains invalid characters" };
  }
  return { ok: true, fullName };
}

export function validatePassword(value: string):
  | { ok: true }
  | { ok: false; error: string } {
  if (value.length < 10 || value.length > 128) {
    return { ok: false, error: "Password must be 10–128 characters" };
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return { ok: false, error: "Include at least one letter and one number" };
  }
  return { ok: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, ip?: string, ua?: string) {
  const token = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
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
          eq(users.registrationStatus, "active"),
          eq(users.totpEnabled, true),
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
  if (!session) throw new Error("UNAUTHORIZED");
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
      // clearing the cookie below is sufficient for invalid tokens
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

async function createChallenge(userId: string, purpose: string, minutes = CHALLENGE_MINUTES) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  await db.insert(authChallenges).values({
    userId,
    purpose,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return token;
}

async function getValidChallenge(token: string, purpose: string) {
  const [row] = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.tokenHash, hashToken(token)),
        eq(authChallenges.purpose, purpose)
      )
    )
    .limit(1);
  if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
    throw new Error("INVALID_CHALLENGE");
  }
  return row;
}

function generateRecoveryCode(): string {
  const chunk = () => nanoid(5).toUpperCase();
  return `${chunk()}-${chunk()}`;
}

export async function registerUser(input: {
  fullName: string;
  username: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const totpSecret = generateTotpSecret();

  const [user] = await db
    .insert(users)
    .values({
      username: input.username,
      fullName: input.fullName,
      name: input.fullName,
      passwordHash,
      status: "active",
      role: "user",
      registrationStatus: "pending",
      totpSecretEncrypted: encryptSecret(totpSecret),
      totpEnabled: false,
      email: null,
    })
    .onConflictDoNothing()
    .returning();

  if (!user) throw new Error("USERNAME_EXISTS");

  await db
    .insert(mailboxes)
    .values({ userId: user.id, status: "active" })
    .onConflictDoNothing();

  const recoveryCodesPlain = Array.from({ length: 10 }, generateRecoveryCode);
  await db.insert(recoveryCodes).values(
    recoveryCodesPlain.map((code) => ({
      userId: user.id,
      codeHash: hashCode(code),
    }))
  );

  const enrollmentToken = await createChallenge(user.id, "enroll", 60);
  return { user, enrollmentToken, recoveryCodesPlain };
}

export async function getEnrollment(token: string) {
  const challenge = await getValidChallenge(token, "enroll");
  const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1);
  if (!user || !user.totpSecretEncrypted) throw new Error("INVALID_CHALLENGE");
  const { buildProvisioningUri, buildQrDataUri, manualKey } = await import("./totp");
  const uri = await buildProvisioningUri(user.totpSecretEncrypted, user.username || "");
  return {
    username: user.username,
    qrDataUri: await buildQrDataUri(uri),
    manualKey: manualKey(user.totpSecretEncrypted),
    issuer: "Nexora Mail",
  };
}

export async function verifyEnrollment(token: string, code: string) {
  const challenge = await getValidChallenge(token, "enroll");
  const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1);
  if (!user || !user.totpSecretEncrypted || !user.username) throw new Error("INVALID_CHALLENGE");
  if (!verifyTotp(user.totpSecretEncrypted, code, user.username)) {
    throw new Error("INVALID_CODE");
  }

  await db
    .update(users)
    .set({
      totpEnabled: true,
      totpVerifiedAt: new Date(),
      registrationStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date(), verifiedAt: new Date() })
    .where(eq(authChallenges.id, challenge.id));

  return { username: user.username };
}

export async function loginUser(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const [user] = await db.select().from(users).where(eq(users.username, normalized)).limit(1);
  if (!user || !user.passwordHash) throw new Error("INVALID_CREDENTIALS");
  if (!(await verifyPassword(password, user.passwordHash))) throw new Error("INVALID_CREDENTIALS");
  if (user.status !== "active") throw new Error("ACCOUNT_SUSPENDED");
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new Error("ACCOUNT_LOCKED");
  }

  if (user.registrationStatus !== "active" || !user.totpEnabled) {
    const enrollmentToken = await createChallenge(user.id, "enroll", 60);
    return { requiresEnrollment: true, enrollmentToken } as const;
  }

  const challengeToken = await createChallenge(user.id, "login");
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), failedLoginAttempts: 0 })
    .where(eq(users.id, user.id));
  return { requiresTwoFactor: true, challengeToken, username: user.username } as const;
}

export async function verifyLoginChallenge(token: string, code: string) {
  const challenge = await getValidChallenge(token, "login");
  const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1);
  if (!user || !user.totpSecretEncrypted || !user.username || !user.totpEnabled) {
    throw new Error("INVALID_CHALLENGE");
  }
  if (!verifyTotp(user.totpSecretEncrypted, code, user.username)) {
    throw new Error("INVALID_CODE");
  }
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date(), verifiedAt: new Date() })
    .where(eq(authChallenges.id, challenge.id));
  return user;
}

export async function requestPasswordReset(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, normalizeUsername(username)))
    .limit(1);
  if (!user || user.registrationStatus !== "active" || !user.totpEnabled) {
    return { challengeToken: null };
  }
  return { challengeToken: await createChallenge(user.id, "reset") };
}

export async function verifyPasswordResetChallenge(token: string, code: string) {
  const challenge = await getValidChallenge(token, "reset");
  const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1);
  if (!user || !user.totpSecretEncrypted || !user.username) throw new Error("INVALID_CHALLENGE");
  if (!verifyTotp(user.totpSecretEncrypted, code, user.username)) throw new Error("INVALID_CODE");
  await db
    .update(authChallenges)
    .set({ verifiedAt: new Date() })
    .where(eq(authChallenges.id, challenge.id));
  return { resetToken: token };
}

export async function resetPassword(token: string, newPassword: string) {
  const challenge = await getValidChallenge(token, "reset");
  if (!challenge.verifiedAt) throw new Error("CHALLENGE_NOT_VERIFIED");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, challenge.userId));
  await revokeAllSessions(challenge.userId);
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(authChallenges.id, challenge.id));
}

export async function requestPasswordChange(userId: string) {
  return { challengeToken: await createChallenge(userId, "change_password") };
}

export async function changePassword(
  userId: string,
  token: string,
  code: string,
  newPassword: string
) {
  const challenge = await getValidChallenge(token, "change_password");
  if (challenge.userId !== userId) throw new Error("INVALID_CHALLENGE");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.totpSecretEncrypted || !user.username) throw new Error("INVALID_CHALLENGE");
  if (!verifyTotp(user.totpSecretEncrypted, code, user.username)) throw new Error("INVALID_CODE");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await revokeAllSessions(userId);
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date(), verifiedAt: new Date() })
    .where(eq(authChallenges.id, challenge.id));
}

export async function recoverWithCode(username: string, code: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, normalizeUsername(username)))
    .limit(1);
  if (!user) throw new Error("INVALID_RECOVERY_CODE");

  const [match] = await db
    .select()
    .from(recoveryCodes)
    .where(eq(recoveryCodes.codeHash, hashCode(code)))
    .limit(1);
  if (!match || match.userId !== user.id || match.usedAt) {
    throw new Error("INVALID_RECOVERY_CODE");
  }
  await db
    .update(recoveryCodes)
    .set({ usedAt: new Date() })
    .where(eq(recoveryCodes.id, match.id));
  await revokeAllSessions(user.id);
  await db
    .update(users)
    .set({
      totpEnabled: false,
      totpSecretEncrypted: encryptSecret(generateTotpSecret()),
      registrationStatus: "pending",
    })
    .where(eq(users.id, user.id));
  return { enrollmentToken: await createChallenge(user.id, "enroll", 60) };
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const RETENTION_DAYS = 10;
export const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;
export const DEFAULT_PLATFORM_DOMAIN = "nexora.mail";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatExpiry(expiresAt: Date | string): string {
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h left`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m left`;
}

export function generateRandomLocalPart(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export function normalizeEmailLocalPart(local: string): string {
  return local.toLowerCase().trim().replace(/[^a-z0-9._+-]/g, "");
}

export function isValidLocalPart(local: string): boolean {
  if (!local || local.length < 1 || local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return /^[a-z0-9]([a-z0-9._+-]*[a-z0-9])?$/i.test(local);
}

export const RESERVED_LOCAL_PARTS = new Set([
  "postmaster", "abuse", "admin", "administrator", "support", "noreply",
  "no-reply", "bounce", "mailer-daemon", "root", "webmaster", "hostmaster",
  "info", "contact", "sales", "help", "security", "privacy", "legal",
  "billing", "accounts", "system", "null", "devnull", "mail", "email",
  "newsletter", "marketing", "spam", "virus", "malware", "phishing",
]);

export function isReservedLocalPart(local: string): boolean {
  return RESERVED_LOCAL_PARTS.has(local.toLowerCase());
}

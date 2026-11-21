import { customAlphabet } from "nanoid";
import {
  DEFAULT_PLATFORM_DOMAIN,
  isReservedLocalPart,
  isValidLocalPart,
  normalizeEmailLocalPart,
} from "./utils";

const randomSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function platformDomain(): string {
  return (process.env.PLATFORM_DOMAIN || DEFAULT_PLATFORM_DOMAIN).toLowerCase().trim();
}

export function randomLocalPart(prefix?: string): string {
  const safePrefix = prefix
    ? normalizeEmailLocalPart(prefix).replace(/[^a-z0-9-]/g, "").slice(0, 16)
    : "";
  const suffix = randomSuffix();
  return safePrefix ? `${safePrefix}-${suffix}` : suffix;
}

export function validateLocalPart(input: string):
  | { ok: true; localPart: string }
  | { ok: false; error: string } {
  const localPart = normalizeEmailLocalPart(input);
  if (!isValidLocalPart(localPart)) {
    return { ok: false, error: "Invalid alias format" };
  }
  if (isReservedLocalPart(localPart)) {
    return { ok: false, error: "This name is reserved" };
  }
  return { ok: true, localPart };
}

export function suggestionsFor(input: string): string[] {
  const base = normalizeEmailLocalPart(input).slice(0, 16);
  const result = new Set<string>();
  for (let i = 0; i < 4; i += 1) {
    const candidate = randomLocalPart(base || "inbox");
    if (isValidLocalPart(candidate) && !isReservedLocalPart(candidate)) {
      result.add(candidate);
    }
  }
  return Array.from(result);
}

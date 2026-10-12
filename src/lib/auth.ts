import { createHmac, timingSafeEqual } from "node:crypto";

// One shared club password for viewing, and a separate admin password for
// adding and refreshing regattas. Both come from environment variables set in
// the Netlify dashboard, never from git.

export type Role = "member" | "admin";

export interface AuthConfig {
  clubPassword?: string;
  adminPassword?: string;
  // Signs session cookies. A long random string.
  sessionSecret?: string;
}

export const SESSION_COOKIE = "crewdash_session";
export const SESSION_DAYS = 30;

export function authConfigFromEnv(env: Record<string, string | undefined>): AuthConfig {
  return {
    clubPassword: env.CLUB_PASSWORD,
    adminPassword: env.ADMIN_PASSWORD,
    sessionSecret: env.SESSION_SECRET,
  };
}

export function isConfigured(config: AuthConfig): boolean {
  return Boolean(config.clubPassword && config.sessionSecret);
}

function sign(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

// Compares via HMAC digests so the comparison takes the same time whatever
// the input's length or content.
function sameSecret(input: string, expected: string, secret: string): boolean {
  return timingSafeEqual(sign(input, secret), sign(expected, secret));
}

/** The role a password grants, or null. Fails closed when not configured. */
export function roleForPassword(password: string, config: AuthConfig): Role | null {
  const secret = config.sessionSecret;
  if (!secret || !config.clubPassword) return null;
  if (config.adminPassword && sameSecret(password, config.adminPassword, secret)) return "admin";
  if (sameSecret(password, config.clubPassword, secret)) return "member";
  return null;
}

export function createSessionToken(role: Role, secret: string, now: Date = new Date()): string {
  const expires = now.getTime() + SESSION_DAYS * 86_400_000;
  const payload = `${role}.${expires}`;
  return `${payload}.${sign(payload, secret).toString("base64url")}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  now: Date = new Date(),
): Role | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expires, signature] = parts as [string, string, string];
  if (role !== "member" && role !== "admin") return null;
  const given = Buffer.from(signature, "base64url");
  const expected = sign(`${role}.${expires}`, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (!(Number(expires) > now.getTime())) return null;
  return role;
}

/** Only same-site paths, so a crafted login link can't redirect elsewhere. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}

import { createHmac, timingSafeEqual } from "node:crypto";

// One shared club password for viewing, a coach password for posting
// announcements, and an admin password for everything else. All come from
// environment variables set in the Netlify dashboard, never from git.

export type Role = "member" | "coach" | "admin";
const ROLES: readonly string[] = ["member", "coach", "admin"];

export interface AuthConfig {
  clubPassword?: string;
  adminPassword?: string;
  coachPassword?: string;
  // Signs session cookies. A long random string.
  sessionSecret?: string;
}

export const SESSION_COOKIE = "crewdash_session";
export const SESSION_DAYS = 30;

export function authConfigFromEnv(env: Record<string, string | undefined>): AuthConfig {
  return {
    clubPassword: env.CLUB_PASSWORD,
    adminPassword: env.ADMIN_PASSWORD,
    coachPassword: env.COACH_PASSWORD,
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
  if (config.coachPassword && sameSecret(password, config.coachPassword, secret)) return "coach";
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
  if (!ROLES.includes(role)) return null;
  const given = Buffer.from(signature, "base64url");
  const expected = sign(`${role}.${expires}`, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (!(Number(expires) > now.getTime())) return null;
  return role as Role;
}

// An invite link logs a new family straight in as a member, so nobody has to pass the club
// password around. It's signed like a session but can't be used as one, and expires on
// its own. Changing SESSION_SECRET cancels every invite (and logs everyone out).
export const INVITE_DAYS = 14;
const INVITE = "invite";

export function createInviteToken(secret: string, now: Date = new Date()): string {
  const payload = `${INVITE}.${now.getTime() + INVITE_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload, secret).toString("base64url")}`;
}

/** The invite's expiry, or null when it isn't a valid, current invite. */
export function verifyInviteToken(
  token: string | null | undefined,
  secret: string | undefined,
  now: Date = new Date(),
): Date | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== INVITE) return null;
  const [, expires, signature] = parts as [string, string, string];
  const given = Buffer.from(signature, "base64url");
  const expected = sign(`${INVITE}.${expires}`, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (!(Number(expires) > now.getTime())) return null;
  return new Date(Number(expires));
}

/** Coaches post announcements. Admins can do everything coaches can. */
export function canCoach(role: Role | null | undefined): boolean {
  return role === "coach" || role === "admin";
}

/** Only same-site paths, so a crafted login link can't redirect elsewhere. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}

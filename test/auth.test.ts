import { describe, expect, it } from "vitest";
import {
  INVITE_DAYS,
  canCoach,
  createInviteToken,
  createSessionToken,
  isConfigured,
  roleForPassword,
  safeNext,
  verifyInviteToken,
  verifySessionToken,
} from "../src/lib/auth.js";

const config = { clubPassword: "oars", adminPassword: "coxswain", sessionSecret: "s3cret" };
const now = new Date("2026-10-12T12:00:00Z");

describe("roleForPassword", () => {
  it("grants member and admin roles", () => {
    expect(roleForPassword("oars", config)).toBe("member");
    expect(roleForPassword("coxswain", config)).toBe("admin");
  });

  it("rejects wrong passwords", () => {
    expect(roleForPassword("", config)).toBeNull();
    expect(roleForPassword("Oars", config)).toBeNull();
  });

  it("fails closed when not configured", () => {
    expect(roleForPassword("oars", { clubPassword: "oars" })).toBeNull();
    expect(roleForPassword("", { sessionSecret: "s3cret" })).toBeNull();
    expect(isConfigured({ sessionSecret: "s3cret" })).toBe(false);
  });

  it("works without an admin password", () => {
    const noAdmin = { clubPassword: "oars", sessionSecret: "s3cret" };
    expect(roleForPassword("oars", noAdmin)).toBe("member");
    expect(roleForPassword("coxswain", noAdmin)).toBeNull();
  });
});

describe("session tokens", () => {
  it("round-trips a role", () => {
    const token = createSessionToken("admin", "s3cret", now);
    expect(verifySessionToken(token, "s3cret", now)).toBe("admin");
  });

  it("expires after 30 days", () => {
    const token = createSessionToken("member", "s3cret", now);
    const later = new Date(now.getTime() + 31 * 86_400_000);
    expect(verifySessionToken(token, "s3cret", later)).toBeNull();
  });

  it("rejects tampering and other secrets", () => {
    const token = createSessionToken("member", "s3cret", now);
    expect(verifySessionToken(token.replace("member", "admin"), "s3cret", now)).toBeNull();
    expect(verifySessionToken(token, "other", now)).toBeNull();
  });

  it.each([undefined, "", "a.b", "member.1.2.3", "root.99999999999999.x"])(
    "rejects malformed token %j",
    (token) => {
      expect(verifySessionToken(token, "s3cret", now)).toBeNull();
    },
  );

  it("rejects tokens when no secret is set", () => {
    expect(
      verifySessionToken(createSessionToken("member", "s3cret", now), undefined, now),
    ).toBeNull();
  });
});

describe("invite tokens", () => {
  it("is valid until it expires", () => {
    const token = createInviteToken("s3cret", now);
    const expires = now.getTime() + INVITE_DAYS * 86_400_000;
    expect(verifyInviteToken(token, "s3cret", now)?.getTime()).toBe(expires);
    expect(verifyInviteToken(token, "s3cret", new Date(expires + 1))).toBeNull();
  });

  it("rejects tampering and other secrets", () => {
    const token = createInviteToken("s3cret", now);
    const [kind, expires, signature] = token.split(".");
    expect(
      verifyInviteToken(`${kind}.${Number(expires) + 1}.${signature}`, "s3cret", now),
    ).toBeNull();
    expect(verifyInviteToken(token, "other", now)).toBeNull();
    expect(verifyInviteToken(token, undefined, now)).toBeNull();
  });

  it("can't be swapped for a session, or a session for an invite", () => {
    expect(verifySessionToken(createInviteToken("s3cret", now), "s3cret", now)).toBeNull();
    expect(
      verifyInviteToken(createSessionToken("member", "s3cret", now), "s3cret", now),
    ).toBeNull();
  });

  it.each([null, "", "invite", "invite.1", "invite.1.2.3"])(
    "rejects malformed invite %j",
    (token) => {
      expect(verifyInviteToken(token, "s3cret", now)).toBeNull();
    },
  );
});

describe("safeNext", () => {
  it.each([
    ["/regatta/r1", "/regatta/r1"],
    ["/admin?x=1", "/admin?x=1"],
    [null, "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
  ])("maps %j to %j", (input, output) => {
    expect(safeNext(input)).toBe(output);
  });
});

describe("coach role", () => {
  const withCoach = { ...config, coachPassword: "stroke" };

  it("is granted by the coach password and survives a session round trip", () => {
    expect(roleForPassword("stroke", withCoach)).toBe("coach");
    expect(roleForPassword("stroke", config)).toBeNull();
    const token = createSessionToken("coach", "s3cret", now);
    expect(verifySessionToken(token, "s3cret", now)).toBe("coach");
  });

  it("lets coaches and admins post announcements, not members", () => {
    expect(canCoach("coach")).toBe(true);
    expect(canCoach("admin")).toBe(true);
    expect(canCoach("member")).toBe(false);
    expect(canCoach(undefined)).toBe(false);
  });

  it("rejects a forged role", () => {
    const [, expires, signature] = createSessionToken("member", "s3cret", now).split(".");
    expect(verifySessionToken(`admin.${expires}.${signature}`, "s3cret", now)).toBeNull();
    expect(verifySessionToken(`owner.${expires}.${signature}`, "s3cret", now)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  isConfigured,
  roleForPassword,
  safeNext,
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

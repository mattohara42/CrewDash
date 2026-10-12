import { describe, expect, it } from "vitest";
import { active, parseAnnouncements, post, remove } from "../src/lib/announcements.js";

const now = new Date("2026-10-12T14:00:00Z");
const later = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

describe("announcements", () => {
  it("posts with the chosen expiry, newest first", () => {
    const first = post([], { text: "Tent is by the boathouse", from: "coach", hours: 4 }, now)!;
    const second = post(first.list, { text: "Lunch at noon", from: "admin", hours: 24 }, later(1))!;
    expect(active(second.list, later(2)).map((a) => a.text)).toEqual([
      "Lunch at noon",
      "Tent is by the boathouse",
    ]);
    expect(active(second.list, later(5)).map((a) => a.text)).toEqual(["Lunch at noon"]);
  });

  it("tidies the text, rejects blanks and falls back to 12 hours", () => {
    expect(post([], { text: "   ", from: "coach", hours: 4 }, now)).toBeNull();
    const { announcement } = post([], { text: " Tent\n moved ", from: "coach", hours: 999 }, now)!;
    expect(announcement.text).toBe("Tent moved");
    expect(announcement.expiresAt).toBe(later(12).toISOString());
    expect(
      post([], { text: "x".repeat(400), from: "coach", hours: 4 }, now)!.announcement.text,
    ).toHaveLength(280);
  });

  it("drops expired ones when posting, keeps five, and removes by id", () => {
    let list = post([], { text: "old", from: "coach", hours: 4 }, now)!.list;
    for (let i = 0; i < 6; i++)
      list = post(list, { text: `m${i}`, from: "coach", hours: 72 }, later(5 + i))!.list;
    expect(list.map((a) => a.text)).toEqual(["m5", "m4", "m3", "m2", "m1"]);
    expect(remove(list, list[0]!.id).map((a) => a.text)).toEqual(["m4", "m3", "m2", "m1"]);
  });

  it("parses stored data defensively", () => {
    expect(parseAnnouncements(null)).toEqual([]);
    expect(parseAnnouncements([{ id: "1", text: "x" }, "junk"])).toEqual([]);
  });
});

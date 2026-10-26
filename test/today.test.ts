import { describe, expect, it } from "vitest";
import { parseClubConfig } from "../src/club.js";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { EMPTY_SETTINGS } from "../src/lib/settings.js";
import { localDate, startMinutes, todayRegattas, zonedInstant } from "../src/lib/today.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };
import { twoDayRaw } from "./fixtures/two-day.js";

const TZ = "America/New_York";
const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };
const record = (date: string) => {
  const regatta = normalizeRegatta("r1", fixture as RawRegattaResults);
  return { regatta: { ...regatta, date }, fetchedAt: "" };
};

describe("time helpers", () => {
  it.each([
    ["9:00:00 AM", 540],
    ["12:15 PM", 735],
    ["12:05:00 AM", 5],
    ["13:05", 785],
    ["", null],
    ["13:05 PM", null],
  ])("startMinutes(%s)", (text, minutes) => {
    expect(startMinutes(text)).toBe(minutes);
  });

  it("finds the instant of a local time across daylight saving", () => {
    expect(zonedInstant("2026-10-11", 540, TZ).toISOString()).toBe("2026-10-11T13:00:00.000Z");
    expect(zonedInstant("2026-12-05", 540, TZ).toISOString()).toBe("2026-12-05T14:00:00.000Z");
  });

  it("uses the club's date, not UTC's, in the evening", () => {
    expect(localDate(new Date("2026-10-12T02:00:00Z"), TZ)).toBe("2026-10-11");
  });
});

describe("todayRegattas", () => {
  const now = new Date("2026-10-11T12:00:00Z");

  it("shows today's and tomorrow's regattas with club events in start order", () => {
    const [today, tomorrow, ...rest] = todayRegattas(
      [record("2026-10-12"), record("2026-10-11"), record("2026-10-09")],
      club,
      EMPTY_SETTINGS,
      TZ,
      now,
    );
    expect(rest).toEqual([]);
    expect(today?.when).toBe("Today");
    expect(tomorrow?.when).toBe("Tomorrow");
    expect(today?.events).toEqual([
      {
        key: "womens u19 8+",
        name: "Womens U19 8+",
        start: "9:00 AM",
        startAt: "2026-10-11T13:00:00.000Z",
        boats: ["Bow 101 · 1st of 2"],
        done: true,
      },
      expect.objectContaining({ name: "Mens Masters 60+ 1x", start: "9:30 AM" }),
    ]);
  });

  it("is empty away from race days", () => {
    expect(todayRegattas([record("2026-10-01")], club, EMPTY_SETTINGS, TZ, now)).toEqual([]);
  });
});

describe("club timezone", () => {
  const base = { name: "X", aliases: ["X"] };
  it("defaults to US Eastern and rejects unknown zones", () => {
    expect(parseClubConfig(base).timezone).toBe(TZ);
    expect(parseClubConfig({ ...base, timezone: "Europe/London" }).timezone).toBe("Europe/London");
    expect(() => parseClubConfig({ ...base, timezone: "Mars/Olympus" })).toThrow(/Time zone/);
  });
});

describe("two-day regattas", () => {
  const twoDay = { regatta: normalizeRegatta("r2", twoDayRaw()), fetchedAt: "" };
  const names = (cards: ReturnType<typeof todayRegattas>) =>
    cards.map((c) => [c.when, c.date, c.events.map((e) => e.name)]);

  it("shows the first day as today and the second as tomorrow", () => {
    const sat = new Date("2026-10-10T14:00:00Z");
    expect(names(todayRegattas([twoDay], club, EMPTY_SETTINGS, TZ, sat))).toEqual([
      ["Today", "2026-10-10", ["Womens U19 8+"]],
      ["Tomorrow", "2026-10-11", ["Mens Masters 60+ 1x"]],
    ]);
  });

  it("still shows the regatta on its second day, with that day's start times", () => {
    const sun = new Date("2026-10-11T14:00:00Z");
    const cards = todayRegattas([twoDay], club, EMPTY_SETTINGS, TZ, sun);
    expect(names(cards)).toEqual([["Today", "2026-10-11", ["Mens Masters 60+ 1x"]]]);
    expect(cards[0]?.events[0]?.startAt).toBe("2026-10-11T13:30:00.000Z");
  });
});

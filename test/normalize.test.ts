import { describe, expect, it } from "vitest";
import {
  eventDate,
  normalizeEntry,
  normalizeRegatta,
  regattaDates,
} from "../src/crewtimer/normalize.js";
import type { RawEntry, RawRegattaResults } from "../src/crewtimer/raw.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };
import { twoDayRaw } from "./fixtures/two-day.js";

const regatta = normalizeRegatta("r1", fixture as RawRegattaResults);
const [womens, masters] = regatta.events;

function entry(overrides: Partial<RawEntry>): RawEntry {
  return { Bow: "1", Crew: "Test", Place: "", RawTime: "", AdjTime: "", ...overrides };
}

describe("normalizeRegatta", () => {
  it("reads regatta info", () => {
    expect(regatta).toMatchObject({
      id: "r1",
      title: "Made-up Head of the Lake",
      date: "2026-10-11",
      raceType: "Head",
      resultsPendingOfficial: true,
    });
    expect(regatta.events).toHaveLength(2);
  });

  it("strips the event number from the event name", () => {
    expect(womens).toMatchObject({ num: "12", name: "Womens U19 8+", official: true });
  });

  it("collapses repeated spaces in event names", () => {
    const raw = { ...fixture, results: [{ Event: "7 Mens  U17   4+", EventNum: "7" }] };
    expect(normalizeRegatta("r3", raw as RawRegattaResults).events[0]?.name).toBe("Mens U17 4+");
  });

  it("falls back to the regatta race type", () => {
    expect(masters?.raceType).toBe("Head");
  });

  it("accepts entries stored as an object with gaps", () => {
    expect(masters?.entries.map((e) => e.bow)).toEqual(["120", "122"]);
  });

  it("parses a finished entry", () => {
    expect(womens?.entries[1]).toMatchObject({
      bow: "102",
      place: 2,
      status: "finished",
      rawTimeMs: 1_180_100,
      adjustedTimeMs: 1_185_100,
      penalties: [{ code: "buoy", seconds: 5 }],
      averageAge: 16,
    });
  });

  it("parses exhibition entries with no place", () => {
    expect(womens?.entries[2]).toMatchObject({
      status: "exhibition",
      place: null,
      adjustedTimeMs: 1_262_500,
    });
  });

  it("parses DNS", () => {
    expect(womens?.entries[3]).toMatchObject({ status: "dns", place: null, adjustedTimeMs: null });
  });

  it("marks entries with no time as pending", () => {
    expect(masters?.entries[1]).toMatchObject({ status: "pending", place: null });
  });

  it("parses handicapped times over an hour", () => {
    expect(masters?.entries[0]).toMatchObject({
      rawTimeMs: 3_750_049,
      adjustedTimeMs: 3_587_649,
      handicapSeconds: -162.4,
    });
  });

  it("rejects a response with no results", () => {
    expect(() => normalizeRegatta("r2", {} as RawRegattaResults)).toThrow(/no results/);
  });
});

describe("normalizeEntry", () => {
  it.each([
    ["DNF", "dnf"],
    ["dq", "dq"],
    ["Scratch", "scratch"],
  ] as const)("recognizes %s", (adjTime, status) => {
    expect(normalizeEntry(entry({ AdjTime: adjTime })).status).toBe(status);
  });

  it("keeps unrecognized AdjTime text without guessing", () => {
    expect(normalizeEntry(entry({ AdjTime: "Under review", Place: 3 }))).toMatchObject({
      status: "unknown",
      place: null,
      adjustedTimeText: "Under review",
    });
  });

  it("accepts a numeric place sent as a string", () => {
    expect(normalizeEntry(entry({ AdjTime: "10:00.000", Place: "4" })).place).toBe(4);
  });
});

describe("multi-day regattas", () => {
  it("dates each event from its day name", () => {
    const r = normalizeRegatta("r2", twoDayRaw());
    expect(r.events.map((e) => eventDate(r, e))).toEqual(["2026-10-10", "2026-10-11"]);
    expect(regattaDates(r)).toEqual(["2026-10-10", "2026-10-11"]);
  });

  it("reads a day list stored as an object", () => {
    const r = normalizeRegatta("r2", twoDayRaw({ "0": "Saturday", "1": "Sunday" }));
    expect(r.events[1]?.day).toBe(1);
  });

  it("puts events with an unknown day on the first day", () => {
    const r = normalizeRegatta("r2", twoDayRaw(["Day 1"]));
    expect(r.events.map((e) => e.day)).toEqual([undefined, undefined]);
    expect(regattaDates(r)).toEqual(["2026-10-10"]);
  });

  it("leaves one-day regattas as they were", () => {
    expect(regatta.events.every((e) => !("day" in e))).toBe(true);
    expect(regattaDates(regatta)).toEqual(["2026-10-11"]);
  });
});

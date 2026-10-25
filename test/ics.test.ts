import { describe, expect, it } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { regattaCalendar } from "../src/lib/ics.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };
import { twoDayRaw } from "./fixtures/two-day.js";

const club = {
  name: "Lakeview Rowing Club",
  aliases: ["Lakeview Rowing Club"],
  timezone: "America/New_York",
};
const now = new Date("2026-10-01T12:00:00Z");
const venue = {
  id: "lake",
  name: "Lake, north basin",
  courseLengthM: null,
  courseBearing: null,
  places: [{ label: "Finish", lat: 43.1, lon: -77.6 }],
  notes: "",
};

describe("regattaCalendar", () => {
  it("lists the club's events at their start times, in UTC", () => {
    const record = { regatta: normalizeRegatta("r1", fixture as RawRegattaResults), fetchedAt: "" };
    const ics = regattaCalendar(record, club, venue, now);
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("UID:r1-12@crewdash");
    expect(ics).toContain("DTSTART:20261011T130000Z");
    expect(ics).toContain("SUMMARY:Womens U19 8+ (bow 101)");
    expect(ics).toContain("LOCATION:Lake\\, north basin");
    expect(ics).toContain("GEO:43.1;-77.6");
  });

  it("falls back to an all-day event without start times", () => {
    const raw = structuredClone(fixture) as RawRegattaResults;
    const events = Array.isArray(raw.results) ? raw.results : Object.values(raw.results);
    for (const e of events) e.Start = "";
    const ics = regattaCalendar(
      { regatta: normalizeRegatta("r1", raw), fetchedAt: "" },
      club,
      null,
      now,
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261011");
    expect(ics).toContain("DTEND;VALUE=DATE:20261012");
    expect(ics).not.toContain("LOCATION");
  });
});

describe("regattaCalendar on a two-day regatta", () => {
  it("puts each event on its own day", () => {
    const record = { regatta: normalizeRegatta("r2", twoDayRaw()), fetchedAt: "" };
    const ics = regattaCalendar(record, club, null, now);
    expect(ics).toContain("DTSTART:20261010T130000Z");
    expect(ics).toContain("DTSTART:20261011T133000Z");
  });

  it("spans both days when there are no start times", () => {
    const raw = twoDayRaw();
    for (const e of raw.results as { Start?: string }[]) e.Start = "";
    const ics = regattaCalendar(
      { regatta: normalizeRegatta("r2", raw), fetchedAt: "" },
      club,
      null,
      now,
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261010");
    expect(ics).toContain("DTEND;VALUE=DATE:20261012");
  });
});

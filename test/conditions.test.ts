import { describe, expect, it, vi } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import {
  describeConditions,
  racingHours,
  regattaConditions,
  summarize,
  windOnCourse,
  type Conditions,
} from "../src/lib/conditions.js";
import { memoryStore } from "../src/lib/store.js";
import { parseBearing } from "../src/lib/venues.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const record = { regatta: normalizeRegatta("r1", fixture as RawRegattaResults), fetchedAt: "" };
const venue = {
  id: "lake",
  name: "Lake",
  courseLengthM: 4800,
  courseBearing: 0,
  places: [{ label: "Finish", lat: 43.1, lon: -77.6 }],
  notes: "",
};
const hourly = {
  time: ["2026-10-11T07:00", "2026-10-11T09:00", "2026-10-11T10:00"],
  temperature_2m: [40, 50, 54],
  precipitation: [1, 0, 0.02],
  wind_speed_10m: [30, 10, 14],
  wind_direction_10m: [90, 350, 10],
};

describe("windOnCourse", () => {
  // Crews row north (0°). Wind is named for where it comes from.
  it.each([
    [0, "headwind"],
    [350, "headwind"],
    [45, "cross-headwind"],
    [270, "crosswind"],
    [135, "cross-tailwind"],
    [180, "tailwind"],
  ])("wind from %d° on a northbound course is a %s", (from, label) => {
    expect(windOnCourse(from, 0)).toBe(label);
  });
});

describe("summarize", () => {
  it("averages only the racing hours, with direction as a vector", () => {
    const c = summarize(hourly, 9, 10, "imperial", false)!;
    expect(c.windSpeed).toBe(12);
    expect(Math.round(c.windFrom)).toBe(2);
    expect(c).toMatchObject({ tempMin: 50, tempMax: 54, rain: 0.02 });
  });
});

describe("describeConditions", () => {
  const base: Conditions = {
    windSpeed: 12.4,
    windFrom: 225,
    tempMin: 54,
    tempMax: 61,
    rain: 0,
    units: "imperial",
    forecast: false,
  };
  it("relates the wind to the course", () => {
    expect(describeConditions(base, 225)).toBe(
      "Wind 12 mph from the SW, a headwind on this course · 54–61°F · dry",
    );
    expect(describeConditions({ ...base, windSpeed: 1, rain: 0.25 }, 45)).toBe(
      "Calm · 54–61°F · 0.25 in of rain",
    );
    expect(describeConditions({ ...base, units: "metric", rain: 3 }, null)).toBe(
      "Wind 12 km/h from the SW · 54–61°C · 3.0 mm of rain",
    );
  });
});

describe("racingHours", () => {
  it("spans the event start times", () => {
    // The fixture's events start at 9:00 and 9:30 AM.
    expect(racingHours(record)).toEqual([9, 11]);
  });
});

describe("regattaConditions", () => {
  const ok = () => vi.fn<typeof fetch>(async () => Response.json({ hourly }));
  const opts = (fetchImpl: typeof fetch, now = new Date("2026-10-20T12:00:00Z")) => ({
    timeZone: "America/New_York",
    units: "imperial" as const,
    today: "2026-10-20",
    now,
    fetchImpl,
  });

  it("uses the archive for old regattas and caches the answer for good", async () => {
    const store = memoryStore();
    const fetchImpl = ok();
    const first = await regattaConditions(record, venue, store.conditions, opts(fetchImpl));
    expect(first?.forecast).toBe(false);
    expect(String(fetchImpl.mock.calls[0]![0])).toContain("archive-api.open-meteo.com");
    await regattaConditions(
      record,
      venue,
      store.conditions,
      opts(fetchImpl, new Date("2027-01-01T00:00:00Z")),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns nothing, and caches the failure, when the service refuses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store = memoryStore();
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("limit", { status: 429 }));
    expect(await regattaConditions(record, venue, store.conditions, opts(fetchImpl))).toBeNull();
    expect(await regattaConditions(record, venue, store.conditions, opts(fetchImpl))).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("skips venues without places", async () => {
    const fetchImpl = ok();
    expect(
      await regattaConditions(
        record,
        { ...venue, places: [] },
        memoryStore().conditions,
        opts(fetchImpl),
      ),
    ).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("parseBearing", () => {
  it.each([
    ["SW", 225],
    ["nne", 22.5],
    ["90", 90],
    ["360", 0],
    ["", null],
    ["up river", undefined],
    ["400", undefined],
  ])("%s -> %s", (text, deg) => {
    expect(parseBearing(text)).toBe(deg);
  });
});

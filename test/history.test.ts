import { describe, expect, it } from "vitest";
import { normalizeRegatta, type Regatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import {
  eventNames,
  historyByEvent,
  regattasInSeries,
  regattasInYear,
  seriesKey,
  seriesName,
  suggestSeries,
} from "../src/lib/history.js";
import { EMPTY_SETTINGS, mergeEvent } from "../src/lib/settings.js";
import type { StoredRegatta } from "../src/lib/store.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const base = normalizeRegatta("r1", fixture as RawRegattaResults);
const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };

function stored(id: string, date: string, title: string, rename?: [string, string]): StoredRegatta {
  const regatta: Regatta = {
    ...base,
    id,
    date,
    title,
    events: base.events.map((e) =>
      rename && e.name === rename[0] ? { ...e, name: rename[1] } : e,
    ),
  };
  return { regatta, fetchedAt: "" };
}

const y2026 = stored("r26", "2026-10-11", "2026 Head of the Lake - Sunday");
const y2025 = stored("r25", "2025-10-12", "Head of the Lake - SUNDAY", [
  "Womens U19 8+",
  "Womens Youth 8+",
]);
const other = stored("r9", "2026-05-01", "Spring Sprints 2026");

describe("series names", () => {
  it.each([
    ["2026 Head of the Genesee - Sunday", "Head of the Genesee - Sunday"],
    ["Head of the Genesee - SUNDAY", "Head of the Genesee - SUNDAY"],
    ["Spring Sprints 2026", "Spring Sprints"],
    ["2025 - Fall Classic", "Fall Classic"],
  ])("suggests %j -> %j", (title, series) => {
    expect(suggestSeries(title)).toBe(series);
  });

  it("matches series ignoring case", () => {
    expect(seriesKey(seriesName(y2026))).toBe(seriesKey(seriesName(y2025)));
  });

  it("prefers a series set by an admin", () => {
    expect(seriesName({ ...other, series: "Head of the Lake - Sunday" })).toBe(
      "Head of the Lake - Sunday",
    );
  });

  it("finds a series' regattas, newest first", () => {
    const found = regattasInSeries([y2025, other, y2026], seriesKey("head of the lake - sunday"));
    expect(found.map((r) => r.regatta.id)).toEqual(["r26", "r25"]);
  });
});

describe("regattasInYear", () => {
  it("keeps one calendar year, newest first", () => {
    expect(regattasInYear([y2025, other, y2026], "2026").map((r) => r.regatta.id)).toEqual([
      "r26",
      "r9",
    ]);
  });
});

describe("historyByEvent", () => {
  it("groups the club's boats by event, newest regatta first", () => {
    const groups = historyByEvent([y2025, y2026], club, EMPTY_SETTINGS);
    const masters = groups.find((g) => g.key === "mens masters 60+ 1x");
    expect(masters?.rows.map((r) => r.regatta.id)).toEqual(["r26", "r25"]);
    expect(masters?.rows[0]?.boats.map((b) => b.entry.bow)).toEqual(["120"]);
  });

  it("keeps renamed events apart until an admin groups them", () => {
    const apart = historyByEvent([y2025, y2026], club, EMPTY_SETTINGS);
    expect(apart.map((g) => g.name)).toEqual([
      "Mens Masters 60+ 1x",
      "Womens U19 8+",
      "Womens Youth 8+",
    ]);

    const merged = historyByEvent(
      [y2025, y2026],
      club,
      mergeEvent(EMPTY_SETTINGS, "Womens Youth 8+", "Womens U19 8+"),
    );
    const womens = merged.find((g) => g.key === "womens u19 8+");
    expect(merged).toHaveLength(2);
    expect(womens?.rows.map((r) => [r.regatta.id, r.eventName])).toEqual([
      ["r26", "Womens U19 8+"],
      ["r25", "Womens Youth 8+"],
    ]);
  });
});

describe("eventNames", () => {
  it("lists every event name once", () => {
    expect(eventNames([y2025, y2026])).toEqual([
      "Mens Masters 60+ 1x",
      "Womens U19 8+",
      "Womens Youth 8+",
    ]);
  });
});

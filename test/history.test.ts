import { describe, expect, it } from "vitest";
import { normalizeRegatta, type Regatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import {
  eventNames,
  historyByEvent,
  regattaLinks,
  regattasInSeries,
  currentSeason,
  regattasInSeason,
  seasonLabel,
  seasonOf,
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

describe("regattasInSeason", () => {
  it("keeps one calendar year when seasons start in January, newest first", () => {
    expect(regattasInSeason([y2025, other, y2026], "2026", 1).map((r) => r.regatta.id)).toEqual([
      "r26",
      "r9",
    ]);
  });

  it("runs a fall-to-spring season over New Year", () => {
    // Seasons from September: fall 2025 and spring 2026 are one season, fall 2026 the next.
    expect(regattasInSeason([y2025, other, y2026], "2025", 9).map((r) => r.regatta.id)).toEqual([
      "r9",
      "r25",
    ]);
    expect(regattasInSeason([y2025, other, y2026], "2026", 9).map((r) => r.regatta.id)).toEqual([
      "r26",
    ]);
  });
});

describe("seasons", () => {
  it.each([
    ["2026-10-11", 1, "2026"],
    ["2026-01-01", 1, "2026"],
    ["2026-08-31", 9, "2025"],
    ["2026-09-01", 9, "2026"],
    ["2027-03-06", 9, "2026"],
  ])("%s with seasons from month %d is season %s", (date, month, season) => {
    expect(seasonOf(date, month)).toBe(season);
  });

  it("labels seasons over New Year with both years", () => {
    expect(seasonLabel("2026", 1)).toBe("2026");
    expect(seasonLabel("2026", 9)).toBe("2026-27");
    expect(seasonLabel("2099", 9)).toBe("2099-00");
  });

  it("finds today's season in the club's time zone", () => {
    // Already New Year's Day in Sydney while it's still December 31 in UTC.
    const now = new Date("2026-12-31T20:00:00Z");
    expect(currentSeason("Australia/Sydney", 1, now)).toBe("2027");
    expect(currentSeason("America/New_York", 1, now)).toBe("2026");
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

describe("regattaLinks", () => {
  const base = { regatta: normalizeRegatta("r1", fixture as RawRegattaResults), fetchedAt: "" };

  it("always links CrewTimer, then names the entries site", () => {
    expect(regattaLinks(base)).toEqual([
      { label: "CrewTimer results", href: "https://www.crewtimer.com/regatta/r1" },
    ]);
    const withLinks = {
      ...base,
      links: {
        registration: "https://www.regattacentral.com/regatta/?job_id=1",
        website: "https://example.org/",
      },
    };
    expect(regattaLinks(withLinks).map((l) => l.label)).toEqual([
      "CrewTimer results",
      "RegattaCentral",
      "Regatta website",
    ]);
    const streamline = {
      ...base,
      links: { registration: "https://streamlinerowing.com/regattas/x" },
    };
    expect(regattaLinks(streamline)[1]?.label).toBe("Streamline");
  });
});

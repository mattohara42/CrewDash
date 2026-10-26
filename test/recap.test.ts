import { describe, expect, it } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { regattaRecap, seasonWrapped } from "../src/lib/recap.js";
import { EMPTY_SETTINGS } from "../src/lib/settings.js";
import { EMPTY_VENUES, saveVenue, setSeriesVenue } from "../src/lib/venues.js";

const club = {
  name: "Lakeview Rowing Club",
  aliases: ["Lakeview Rowing Club"],
  seasonStartMonth: 1,
};
const entry = (crew: string, bow: string, place: number, time: string) => ({
  Bow: bow,
  Crew: crew,
  Place: place,
  RawTime: time,
  AdjTime: time,
});
// Same event two years running. Lakeview finishes 3rd then 1st, and gets closer to the winner.
function regatta(id: string, date: string, ours: string, winner: string) {
  const raw: RawRegattaResults = {
    regattaInfo: { Title: `${date.slice(0, 4)} Head of the Lake`, Date: date },
    results: [
      {
        Event: "1 Womens U17 4+",
        EventNum: "1",
        entries: [
          entry("Hillside Boat Club", "1", 1, winner),
          entry("Hillside Boat Club", "2", 2, "20:00.000"),
          entry("Lakeview Rowing Club", "3", 3, ours),
        ],
      },
    ],
  };
  return { regatta: normalizeRegatta(id, raw), fetchedAt: "" };
}
const lastYear = regatta("a", "2025-10-12", "20:10.000", "19:40.000");
const thisYear = regatta("b", "2026-10-11", "19:50.000", "19:45.000");

describe("regattaRecap", () => {
  it("lists medals and the gain on last year", () => {
    const recap = regattaRecap(thisYear, [lastYear, thisYear], club, EMPTY_SETTINGS);
    expect(recap).toMatchObject({ boats: 1, wins: 0, podiums: 1 });
    expect(recap.medals).toEqual([{ event: "Womens U17 4+", place: 3, fieldSize: 3 }]);
    expect(recap.gains[0]).toMatchObject({ event: "Womens U17 4+", savedMs: 25_000 });
  });

  it("doesn't compare with later years", () => {
    expect(regattaRecap(lastYear, [lastYear, thisYear], club, EMPTY_SETTINGS).gains).toEqual([]);
  });
});

describe("seasonWrapped", () => {
  it("adds up the season, with distance from venue course lengths", () => {
    let venues = saveVenue(EMPTY_VENUES, {
      name: "Lake",
      courseLengthM: 4500,
      courseBearing: null,
      places: [],
      notes: "",
    });
    venues = setSeriesVenue(venues, "Head of the Lake", "lake");
    const w = seasonWrapped("2026", [lastYear, thisYear], club, EMPTY_SETTINGS, venues);
    expect(w).toMatchObject({ regattas: 1, boats: 1, podiums: 1, km: 4.5, unmeasured: 0 });
    expect(w.best).toEqual({ event: "Womens U17 4+", place: 3, fieldSize: 3 });
    expect(w.improved?.savedMs).toBe(25_000);
  });

  it("takes a fall-to-spring season from both calendar years", () => {
    const fall = { ...club, seasonStartMonth: 9 };
    // Both regattas are in October, so they're in seasons 2025 and 2026 either way.
    expect(
      seasonWrapped("2025", [lastYear, thisYear], fall, EMPTY_SETTINGS, EMPTY_VENUES),
    ).toMatchObject({ regattas: 1 });
  });

  it("counts boats at venues without a course length", () => {
    expect(seasonWrapped("2026", [thisYear], club, EMPTY_SETTINGS, EMPTY_VENUES)).toMatchObject({
      km: 0,
      unmeasured: 1,
      improved: null,
    });
  });
});

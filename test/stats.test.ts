import { describe, expect, it } from "vitest";
import { normalizeRegatta, type Regatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { EMPTY_SETTINGS } from "../src/lib/settings.js";
import { marginComparison, seasonStats } from "../src/lib/stats.js";
import type { StoredRegatta } from "../src/lib/store.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const base = normalizeRegatta("r1", fixture as RawRegattaResults);
const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };
const withExh = { ...club, aliases: [...club.aliases, "Lakeview Rowing Club - EXH"] };

function stored(id: string, date: string, change?: (r: Regatta) => Regatta): StoredRegatta {
  const regatta = { ...base, id, date };
  return { regatta: change ? change(regatta) : regatta, fetchedAt: "" };
}

// Makes the club's Womens U19 8+ boat finish 2nd, 15s behind the other crew.
function clubSecond(r: Regatta): Regatta {
  return {
    ...r,
    events: r.events.map((ev) => ({
      ...ev,
      entries: ev.entries.map((en) =>
        en.bow === "101"
          ? { ...en, place: 2, adjustedTimeMs: 1_200_100 }
          : en.bow === "102"
            ? { ...en, place: 1 }
            : en,
      ),
    })),
  };
}

describe("seasonStats", () => {
  it("counts regattas, boats and finishing places", () => {
    const stats = seasonStats(
      [stored("r1", "2026-10-11"), stored("r2", "2026-10-18", clubSecond)],
      withExh,
    );
    expect(stats).toMatchObject({ regattas: 2, boats: 6, wins: 3, podiums: 4 });
    expect(stats.places).toEqual({ "1st": 3, "2nd": 1, "3rd": 0, "4th": 0, "5th+": 0 });
  });

  it("skips regattas the club didn't race", () => {
    const other = { name: "Nobody", aliases: ["Nobody"] };
    expect(seasonStats([stored("r1", "2026-10-11")], other)).toMatchObject({
      regattas: 0,
      boats: 0,
    });
  });

  it("puts places past 4th in one bucket", () => {
    const far = stored("r1", "2026-10-11", (r) => ({
      ...r,
      events: r.events.map((ev) => ({
        ...ev,
        entries: ev.entries.map((en) => (en.bow === "101" ? { ...en, place: 9 } : en)),
      })),
    }));
    expect(seasonStats([far], club).places["5th+"]).toBe(1);
  });
});

describe("marginComparison", () => {
  it("compares the club's closest finish in events raced both years", () => {
    const rows = marginComparison(
      [stored("r26", "2026-10-11"), stored("r25", "2025-10-12", clubSecond)],
      withExh,
      EMPTY_SETTINGS,
    );
    expect(rows).toEqual([
      {
        eventName: "Mens Masters 60+ 1x",
        older: { year: "2025", regattaId: "r25", marginMs: 0, place: 1, fieldSize: 1 },
        newer: { year: "2026", regattaId: "r26", marginMs: 0, place: 1, fieldSize: 1 },
      },
      {
        eventName: "Womens U19 8+",
        // The exhibition boat is left out; the placed boat counts.
        older: { year: "2025", regattaId: "r25", marginMs: 15_000, place: 2, fieldSize: 2 },
        newer: { year: "2026", regattaId: "r26", marginMs: 0, place: 1, fieldSize: 2 },
      },
    ]);
  });

  it("needs two years", () => {
    expect(marginComparison([stored("r26", "2026-10-11")], club, EMPTY_SETTINGS)).toEqual([]);
  });

  it("uses only the two most recent years", () => {
    const rows = marginComparison(
      [
        stored("r26", "2026-10-11"),
        stored("r25", "2025-10-12"),
        stored("r24", "2024-10-13", clubSecond),
      ],
      club,
      EMPTY_SETTINGS,
    );
    expect(rows.map((r) => [r.older.year, r.newer.year])).toEqual([
      ["2025", "2026"],
      ["2025", "2026"],
    ]);
  });
});

describe("seasonBoats", async () => {
  const { normalizeRegatta } = await import("../src/crewtimer/normalize.js");
  const { parseBoatFilter, seasonBoats } = await import("../src/lib/stats.js");
  const fixture = (await import("./fixtures/regatta.json", { with: { type: "json" } })).default;
  const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };
  const record = { regatta: normalizeRegatta("r1", fixture as never), fetchedAt: "" };

  it("filters the club's boats by result", () => {
    const count = (show: string) =>
      seasonBoats([record], club, parseBoatFilter(show)).reduce((n, g) => n + g.rows.length, 0);
    expect(count("all")).toBe(2);
    expect(count("wins")).toBe(2);
    expect(count("2nd")).toBe(0);
    expect(count("nonsense")).toBe(2);
  });
});

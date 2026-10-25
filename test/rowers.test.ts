import { describe, expect, it } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { lineupKey, setLineup } from "../src/lib/lineups.js";
import { buildRowers, rowerStats } from "../src/lib/rowers.js";
import { addRower, EMPTY_ROSTER } from "../src/lib/roster.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };
const now = new Date("2026-10-13T12:00:00Z");
const record = (id: string, date: string) => {
  const regatta = normalizeRegatta(id, fixture as RawRegattaResults);
  return { regatta: { ...regatta, id, date }, fetchedAt: "" };
};

describe("buildRowers", () => {
  const older = record("r1", "2025-10-12");
  const newer = record("r2", "2026-10-11");
  // Event 12, bow 101 is a Lakeview eight that won. Event 13, bow 120 is a single.
  let first = setLineup(
    {},
    lineupKey("12", "101"),
    {
      seats: [{ name: "Avery Example" }, { name: "Blake Example" }],
      cox: { name: "Casey Example" },
      from: "coach",
    },
    now,
  );
  first = setLineup(
    first,
    lineupKey("13", "120"),
    { seats: [{ name: "avery  example" }], cox: null, from: "coach" },
    now,
  );
  const second = setLineup(
    {},
    lineupKey("12", "101"),
    {
      seats: [{ name: "Avery Example" }, { name: "Drew Example", sub: true }],
      cox: null,
      from: "coach",
    },
    now,
  );
  const rowers = buildRowers(
    [older, newer],
    new Map([
      ["r1", first],
      ["r2", second],
    ]),
    club,
  );

  it("joins lineups to results and groups spellings that differ only in case and spacing", () => {
    const avery = rowers.find((r) => r.key === "avery example")!;
    expect(avery.races.map((r) => [r.record.regatta.id, r.event.num, r.seat])).toEqual([
      ["r2", "12", "Bow"],
      ["r1", "12", "Bow"],
      ["r1", "13", "Sculler"],
    ]);
    expect(rowerStats(avery)).toEqual({ races: 3, wins: 3, podiums: 3 });
  });

  it("includes coxswains and sorts by name", () => {
    expect(rowers.map((r) => r.name)).toEqual([
      "Avery Example",
      "Blake Example",
      "Casey Example",
      "Drew Example",
    ]);
    expect(rowers.find((r) => r.name === "Casey Example")!.races[0]!.seat).toBe("Cox");
  });

  it("is empty without lineups", () => {
    expect(buildRowers([older], new Map(), club)).toEqual([]);
  });

  it("marks subs", () => {
    const drew = rowers.find((r) => r.name === "Drew Example")!;
    expect(drew.races[0]!.sub).toBe(true);
  });

  it("uses the roster name for linked seats, so a rename shows everywhere", () => {
    const added = addRower(EMPTY_ROSTER, { name: "Jon Example" }, "2026");
    const id = added.id;
    const roster = { rowers: added.roster.rowers.map((r) => ({ ...r, name: "John Example" })) };
    const lineups = setLineup(
      {},
      lineupKey("12", "101"),
      { seats: [{ name: "Jon Example", rowerId: id! }], cox: null, from: "coach" },
      now,
    );
    const [john] = buildRowers([newer], new Map([["r2", lineups]]), club, roster);
    expect(john).toMatchObject({ key: "jon example", name: "John Example" });
  });
});

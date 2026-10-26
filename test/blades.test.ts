import { describe, expect, it } from "vitest";
import { parseClubConfig } from "../src/club.js";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { PATTERNS, accentPath } from "../src/lib/blade.js";
import {
  EMPTY_BLADES,
  bladeFor,
  crewClub,
  fullField,
  otherClubs,
  parseBladeData,
  removeClubBlade,
  setClubBlade,
} from "../src/lib/blades.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const club = parseClubConfig({
  name: "Lakeview Rowing Club",
  aliases: ["Lakeview Rowing Club", "Lakeview Rowing Club - EXH"],
  colors: { blade: { base: "#112233", tip: "#ddeeff" } },
});
const chevron = { pattern: "chevron" as const, base: "#ffffff", accent: "#b22234" };
const regatta = normalizeRegatta("r1", fixture as RawRegattaResults);

describe("patterns", () => {
  it("has an accent shape for every pattern except plain", () => {
    for (const p of PATTERNS) expect(accentPath(p) === "").toBe(p === "plain");
  });
});

describe("crewClub", () => {
  it.each([
    ["Hillside Boat Club (B)", "Hillside Boat Club"],
    ["Hillside Boat Club - EXH", "Hillside Boat Club"],
    ["  Hillside   Boat Club ", "Hillside Boat Club"],
  ])("%s -> %s", (crew, name) => expect(crewClub(crew)).toBe(name));
});

describe("club blades", () => {
  it("matches boat letters, exhibition crews and spacing to one saved club", () => {
    const data = setClubBlade(EMPTY_BLADES, "Hillside Boat Club (A)", chevron);
    expect(data.clubs).toEqual([{ name: "Hillside Boat Club", design: chevron }]);
    expect(bladeFor("hillside boat club - EXH", data, club)).toEqual(chevron);
    expect(bladeFor("Northgate Crew", data, club)).toBeNull();
  });

  it("uses the club's own blade from its settings", () => {
    expect(bladeFor("Lakeview Rowing Club (B)", EMPTY_BLADES, club)).toEqual({
      pattern: "tips",
      base: "#112233",
      accent: "#ddeeff",
    });
  });

  it("replaces and removes a club's blade", () => {
    let data = setClubBlade(EMPTY_BLADES, "Hillside Boat Club", chevron);
    data = setClubBlade(data, "Hillside Boat Club", { ...chevron, pattern: "spots" });
    expect(data.clubs).toHaveLength(1);
    expect(data.clubs[0]!.design.pattern).toBe("spots");
    expect(removeClubBlade(data, "Hillside Boat Club (B)").clubs).toEqual([]);
  });

  it("drops stored entries with a bad pattern or color", () => {
    expect(
      parseBladeData({
        clubs: [
          { name: "Good", design: chevron },
          { name: "Bad pattern", design: { ...chevron, pattern: "zigzag" } },
          { name: "Bad color", design: { ...chevron, base: "red" } },
          { name: "", design: chevron },
        ],
      }).clubs.map((c) => c.name),
    ).toEqual(["Good"]);
    expect(parseBladeData(null)).toEqual(EMPTY_BLADES);
  });
});

describe("otherClubs", () => {
  it("lists other clubs once each, most entries first, without the club itself", () => {
    const clubs = otherClubs([{ regatta, fetchedAt: "" }], club);
    expect(clubs.map((c) => c.name)).not.toContain("Lakeview Rowing Club");
    expect(clubs[0]).toMatchObject({ name: "Hillside Boat Club" });
    expect(new Set(clubs.map((c) => c.name)).size).toBe(clubs.length);
  });
});

describe("fullField", () => {
  it("puts placed boats first, then exhibition, then non-finishers", () => {
    const event = regatta.events[0]!;
    const order = fullField(event).map((e) => e.status);
    expect(order).toEqual(["finished", "finished", "exhibition", "dns"]);
    expect(fullField(event).map((e) => e.place)).toEqual([1, 2, null, null]);
  });
});

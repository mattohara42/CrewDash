import { describe, expect, it } from "vitest";
import { parseClubConfig } from "../src/club.js";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { MAX_LAYERS, SHAPES, designFromForm, parseDesign, shapePath } from "../src/lib/blade.js";
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
const chevron = { base: "#ffffff", layers: [{ shape: "chevron" as const, color: "#b22234" }] };
const regatta = normalizeRegatta("r1", fixture as RawRegattaResults);

describe("designs", () => {
  it("has a path for every shape", () => {
    for (const s of SHAPES) expect(shapePath(s)).toMatch(/^M/);
  });

  it("reads blades saved as one pattern and two colors", () => {
    expect(parseDesign({ pattern: "chevron", base: "#ffffff", accent: "#b22234" })).toEqual(
      chevron,
    );
    expect(parseDesign({ pattern: "plain", base: "#2f4f4f", accent: "#2f4f4f" })).toEqual({
      base: "#2f4f4f",
      layers: [],
    });
  });

  it("refuses bad shapes, bad colors and too many layers", () => {
    const layer = { shape: "tips", color: "#000000" };
    expect(parseDesign({ base: "#ffffff", layers: [{ ...layer, shape: "zigzag" }] })).toBeNull();
    expect(parseDesign({ base: "#ffffff", layers: [{ ...layer, color: "red" }] })).toBeNull();
    expect(parseDesign({ base: "white", layers: [] })).toBeNull();
    expect(parseDesign({ base: "#ffffff" })).toBeNull();
    const many = Array.from({ length: MAX_LAYERS + 1 }, () => layer);
    expect(parseDesign({ base: "#ffffff", layers: many })).toBeNull();
  });

  it("reads an editor's fields in order, skipping layers with no shape", () => {
    const fields: Record<string, string> = {
      bladeBase: "#1d3c8f",
      bladeShape0: "chevron-tip",
      bladeColor0: "#7a1f1f",
      bladeShape1: "",
      bladeColor1: "#123456",
      bladeShape2: "chevron-edge",
      bladeColor2: "#f2c14e",
    };
    expect(parseDesign(designFromForm((n) => fields[n] ?? "", "blade"))).toEqual({
      base: "#1d3c8f",
      layers: [
        { shape: "chevron-tip", color: "#7a1f1f" },
        { shape: "chevron-edge", color: "#f2c14e" },
      ],
    });
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
      base: "#112233",
      layers: [{ shape: "tips", color: "#ddeeff" }],
    });
  });

  it("replaces and removes a club's blade", () => {
    let data = setClubBlade(EMPTY_BLADES, "Hillside Boat Club", chevron);
    const spots = { base: "#ffffff", layers: [{ shape: "spots" as const, color: "#000000" }] };
    data = setClubBlade(data, "Hillside Boat Club", spots);
    expect(data.clubs).toHaveLength(1);
    expect(data.clubs[0]!.design).toEqual(spots);
    expect(removeClubBlade(data, "Hillside Boat Club (B)").clubs).toEqual([]);
  });

  it("drops stored entries with a bad pattern or color", () => {
    expect(
      parseBladeData({
        clubs: [
          { name: "Good", design: chevron },
          { name: "Bad shape", design: { ...chevron, layers: [{ shape: "zigzag" }] } },
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

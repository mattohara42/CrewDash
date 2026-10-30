import { describe, expect, it } from "vitest";
import { parseClubConfig } from "../src/club.js";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { MAX_LAYERS, SHAPES, designFromForm, parseDesign, shapePath } from "../src/lib/blade.js";
import {
  EMPTY_BLADES,
  bladeFor,
  crewClub,
  findClub,
  fullField,
  mergeClubs,
  otherClubs,
  parseBladeData,
  removeClubBlade,
  sameClub,
  setClubBlade,
  unmergeClub,
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

describe("sameClub", () => {
  it("ignores boat letters, exhibition crews, case and spacing", () => {
    expect(sameClub("Hillside Boat Club (B)", "hillside  boat club - EXH")).toBe(true);
    expect(sameClub("Hillside Boat Club", "Hillside Rowing Club")).toBe(false);
  });
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

describe("merging clubs", () => {
  const spots = { base: "#000000", layers: [{ shape: "spots" as const, color: "#ffffff" }] };

  it("counts a merged name as the club, with its blade", () => {
    let data = setClubBlade(EMPTY_BLADES, "Northgate Rowing Club, Inc.", chevron);
    data = mergeClubs(data, "Northgate RC (A)", "Northgate Rowing Club, Inc.");
    expect(data.clubs).toEqual([
      { name: "Northgate Rowing Club, Inc.", aliases: ["Northgate RC"], design: chevron },
    ]);
    expect(bladeFor("Northgate RC (B)", data, club)).toEqual(chevron);
    expect(findClub(data, "northgate rc - EXH")?.name).toBe("Northgate Rowing Club, Inc.");
  });

  it("keeps the target's blade, or takes the merged club's", () => {
    let data = setClubBlade(EMPTY_BLADES, "Northgate RC", spots);
    data = setClubBlade(data, "Northgate Rowing Club", chevron);
    expect(mergeClubs(data, "Northgate RC", "Northgate Rowing Club").clubs[0]!.design).toEqual(
      chevron,
    );
    const onlySource = setClubBlade(EMPTY_BLADES, "Northgate RC", spots);
    expect(mergeClubs(onlySource, "Northgate RC", "Northgate Rowing Club").clubs).toEqual([
      { name: "Northgate Rowing Club", aliases: ["Northgate RC"], design: spots },
    ]);
  });

  it("merges clubs that have no blade yet, and saving a blade under any name keeps the merge", () => {
    let data = mergeClubs(EMPTY_BLADES, "Northgate RC", "Northgate Rowing Club");
    expect(data.clubs).toEqual([
      { name: "Northgate Rowing Club", aliases: ["Northgate RC"], design: null },
    ]);
    data = setClubBlade(data, "Northgate RC", chevron);
    expect(data.clubs).toEqual([
      { name: "Northgate Rowing Club", aliases: ["Northgate RC"], design: chevron },
    ]);
    data = removeClubBlade(data, "Northgate Rowing Club");
    expect(data.clubs[0]).toMatchObject({ aliases: ["Northgate RC"], design: null });
  });

  it("carries names already merged into the club being merged", () => {
    let data = mergeClubs(EMPTY_BLADES, "NRC", "Northgate RC");
    data = mergeClubs(data, "Northgate RC", "Northgate Rowing Club");
    expect(data.clubs).toEqual([
      { name: "Northgate Rowing Club", aliases: ["Northgate RC", "NRC"], design: null },
    ]);
  });

  it("refuses to merge a club with itself", () => {
    expect(() => mergeClubs(EMPTY_BLADES, "Northgate RC (A)", "northgate rc")).toThrow();
    const data = mergeClubs(EMPTY_BLADES, "Northgate RC", "Northgate Rowing Club");
    expect(() => mergeClubs(data, "Northgate RC", "Northgate Rowing Club")).toThrow();
  });

  it("unmerges a name, dropping an entry left with nothing", () => {
    let data = mergeClubs(EMPTY_BLADES, "NRC", "Northgate RC");
    data = mergeClubs(data, "Northgate RC", "Northgate Rowing Club");
    data = unmergeClub(data, "NRC");
    expect(data.clubs[0]!.aliases).toEqual(["Northgate RC"]);
    expect(unmergeClub(data, "Northgate RC").clubs).toEqual([]);
    const withBlade = setClubBlade(data, "Northgate Rowing Club", chevron);
    expect(unmergeClub(withBlade, "Northgate RC").clubs).toEqual([
      { name: "Northgate Rowing Club", design: chevron },
    ]);
    expect(unmergeClub(withBlade, "Northgate Rowing Club")).toBe(withBlade);
  });

  it("reads merged names, and keeps an entry with names but no blade", () => {
    expect(
      parseBladeData({
        clubs: [
          { name: "A Club", aliases: ["AC", "", 3], design: null },
          { name: "B Club", aliases: [], design: null },
        ],
      }).clubs,
    ).toEqual([{ name: "A Club", aliases: ["AC"], design: null }]);
  });
});

describe("otherClubs", () => {
  it("lists other clubs once each, most entries first, without the club itself", () => {
    const clubs = otherClubs([{ regatta, fetchedAt: "" }], club);
    expect(clubs.map((c) => c.name)).not.toContain("Lakeview Rowing Club");
    expect(clubs[0]).toMatchObject({ name: "Hillside Boat Club" });
    expect(new Set(clubs.map((c) => c.name)).size).toBe(clubs.length);
  });

  it("counts merged names toward the club they were merged into", () => {
    const renamed = structuredClone(regatta);
    const hillside = renamed.events
      .flatMap((e) => e.entries)
      .filter((e) => e.crew === "Hillside Boat Club");
    hillside[0]!.crew = "Hillside BC";
    const records = [{ regatta: renamed, fetchedAt: "" }];
    expect(otherClubs(records, club).map((c) => c.name)).toContain("Hillside BC");
    const merged = mergeClubs(EMPTY_BLADES, "Hillside BC", "Hillside Boat Club");
    expect(otherClubs(records, club, merged)).toEqual([
      { name: "Hillside Boat Club", entries: hillside.length },
    ]);
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

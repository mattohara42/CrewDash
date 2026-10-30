import { describe, expect, it } from "vitest";
import { matchClub, parseClubConfig } from "../src/club.js";
import clubJson from "../club.json" with { type: "json" };

const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club", "Lakeview RC"] };

describe("matchClub", () => {
  it("matches aliases ignoring case and spacing", () => {
    expect(matchClub("lakeview  rowing club ", club)).toBe("match");
    expect(matchClub("Lakeview RC", club)).toBe("match");
  });

  it("matches aliases with a boat letter", () => {
    expect(matchClub("Lakeview Rowing Club (A)", club)).toBe("match");
    expect(matchClub("Lakeview RC (b)", club)).toBe("match");
    expect(matchClub("Lakeview Rowing Club (AB)", club)).toBe("near");
  });

  it("matches aliases with a bare boat letter", () => {
    expect(matchClub("Lakeview RC A", club)).toBe("match");
    expect(matchClub("Lakeview Rowing Club b", club)).toBe("match");
    expect(matchClub("Lakeview RC Z", club)).toBe("near");
  });

  it("matches an alias that itself ends in a letter", () => {
    expect(matchClub("Crew B", { name: "Crew B", aliases: ["Crew B"] })).toBe("match");
  });

  it("flags names that contain an alias as near", () => {
    expect(matchClub("Lakeview Rowing Club - EXH", club)).toBe("near");
  });

  it("ignores other clubs", () => {
    expect(matchClub("Hillside Boat Club", club)).toBe("none");
  });
});

describe("parseClubConfig", () => {
  it("accepts the repo's club.json", () => {
    expect(parseClubConfig(clubJson).aliases.length).toBeGreaterThan(0);
  });

  it.each([
    null,
    {},
    { name: "X", aliases: [] },
    { name: "X", aliases: [" "] },
    { name: " ", aliases: ["X"] },
  ])("rejects %j", (value) => {
    expect(() => parseClubConfig(value)).toThrow(/at least one name/);
  });

  it("rejects overlong names and alias lists", () => {
    expect(() => parseClubConfig({ name: "X".repeat(101), aliases: ["X"] })).toThrow(/at most/);
    expect(() =>
      parseClubConfig({ name: "X", aliases: Array.from({ length: 31 }, (_, i) => `X${i}`) }),
    ).toThrow(/at most 30/);
  });
});

describe("locale and seasons", () => {
  const base = { name: "X", aliases: ["X"] };
  it("default to US English and calendar-year seasons", () => {
    expect(parseClubConfig(base)).toMatchObject({ locale: "en-US", seasonStartMonth: 1 });
  });

  it("accept a club's own", () => {
    expect(parseClubConfig({ ...base, locale: "en-gb", seasonStartMonth: 9 })).toMatchObject({
      locale: "en-GB",
      seasonStartMonth: 9,
    });
  });

  it.each([
    [{ locale: "not a locale" }, /Locale/],
    [{ locale: 7 }, /Locale/],
    [{ seasonStartMonth: 0 }, /Season start/],
    [{ seasonStartMonth: 13 }, /Season start/],
    [{ seasonStartMonth: "9" }, /Season start/],
  ])("rejects %j", (extra, message) => {
    expect(() => parseClubConfig({ ...base, ...extra })).toThrow(message);
  });
});

describe("blade colors", async () => {
  const { parseClubConfig } = await import("../src/club.js");
  const base = { name: "X", aliases: ["X"] };
  it("default to the stripe colors and accept their own", () => {
    const stripes = parseClubConfig({
      ...base,
      colors: { secondary: "#112233", accent: "#445566" },
    });
    expect(stripes.colors.blade).toEqual({
      base: "#112233",
      layers: [{ shape: "tips", color: "#445566" }],
    });
    // Settings saved before blades had layers.
    const old = parseClubConfig({
      ...base,
      colors: { blade: { base: "#000000", tip: "#ffffff" } },
    });
    expect(old.colors.blade).toEqual({
      base: "#000000",
      layers: [{ shape: "tips", color: "#ffffff" }],
    });
    expect(() => parseClubConfig({ ...base, colors: { blade: { base: "red" } } })).toThrow(
      /blade.base/,
    );
  });

  it("accept a layered blade and refuse a bad one", () => {
    const blade = {
      base: "#1d3c8f",
      layers: [
        { shape: "chevron-tip", color: "#7a1f1f" },
        { shape: "chevron-edge", color: "#f2c14e" },
      ],
    };
    expect(parseClubConfig({ ...base, colors: { blade } }).colors.blade).toEqual(blade);
    expect(() =>
      parseClubConfig({ ...base, colors: { blade: { ...blade, layers: [{ shape: "x" }] } } }),
    ).toThrow(/blade needs/);
  });
});

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

  it.each([null, {}, { name: "X", aliases: [] }, { name: "X", aliases: [" "] }])(
    "rejects %j",
    (value) => {
      expect(() => parseClubConfig(value)).toThrow(/club\.json/);
    },
  );
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
    [{ locale: "not a locale" }, /locale/],
    [{ locale: 7 }, /locale/],
    [{ seasonStartMonth: 0 }, /seasonStartMonth/],
    [{ seasonStartMonth: 13 }, /seasonStartMonth/],
    [{ seasonStartMonth: "9" }, /seasonStartMonth/],
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
    expect(stripes.colors.blade).toEqual({ base: "#112233", tip: "#445566" });
    const own = parseClubConfig({
      ...base,
      colors: { blade: { base: "#000000", tip: "#ffffff" } },
    });
    expect(own.colors.blade).toEqual({ base: "#000000", tip: "#ffffff" });
    expect(() => parseClubConfig({ ...base, colors: { blade: { base: "red" } } })).toThrow(
      /blade.base/,
    );
  });
});

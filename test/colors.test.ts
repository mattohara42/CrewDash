import { describe, expect, it } from "vitest";
import { parseClubConfig } from "../src/club.js";
import { contrast } from "../src/lib/color.js";
import clubJson from "../club.json" with { type: "json" };

// Surfaces from src/layouts/Base.astro. Keep in sync if they change.
const LIGHT_SURFACE = "#ffffff";
const DARK_SURFACE = "#141a2e";
const { colors } = parseClubConfig(clubJson);

describe("club.json colors", () => {
  it("keep white header text readable", () => {
    expect(contrast("#ffffff", colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("keep chart marks visible on both themes", () => {
    expect(contrast(colors.chart.light.strong, LIGHT_SURFACE)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.chart.dark.strong, DARK_SURFACE)).toBeGreaterThanOrEqual(3);
  });
});

describe("parseClubConfig colors", () => {
  it("falls back to defaults when colors are missing", () => {
    expect(parseClubConfig({ name: "X", aliases: ["X"] }).colors.primary).toMatch(
      /^#[0-9a-f]{6}$/i,
    );
  });

  it("rejects colors that aren't hex", () => {
    expect(() =>
      parseClubConfig({ name: "X", aliases: ["X"], colors: { primary: "red" } }),
    ).toThrow(/colors\.primary/);
    expect(() =>
      parseClubConfig({
        name: "X",
        aliases: ["X"],
        colors: { chart: { dark: { strong: "#fff" } } },
      }),
    ).toThrow(/chart\.dark\.strong/);
  });
});

describe("contrast", () => {
  it("matches known WCAG ratios", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

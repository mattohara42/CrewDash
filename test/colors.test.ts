import { describe, expect, it } from "vitest";
import { DEFAULT_COLORS, colorProblems, parseClubConfig } from "../src/club.js";
import { contrast } from "../src/lib/color.js";
import clubJson from "../club.json" with { type: "json" };

describe("colorProblems", () => {
  it("passes the default colors and club.json's", () => {
    expect(colorProblems(DEFAULT_COLORS)).toEqual([]);
    expect(colorProblems(parseClubConfig(clubJson).colors)).toEqual([]);
  });

  it("refuses a header too light for white text and charts that can't be seen", () => {
    expect(colorProblems({ ...DEFAULT_COLORS, primary: "#f4b81e" })).toEqual([
      expect.stringMatching(/header color is too light/),
    ]);
    const chart = {
      light: { strong: "#eeeeee", muted: "#eeeeee" },
      dark: { strong: "#151b30", muted: "#151b30" },
    };
    expect(colorProblems({ ...DEFAULT_COLORS, chart })).toHaveLength(2);
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
    ).toThrow(/primary/);
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

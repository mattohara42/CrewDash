import { describe, expect, it } from "vitest";
import { parsePenaltyCode, parseTime } from "../src/crewtimer/parse.js";

describe("parseTime", () => {
  it.each([
    ["19:28.427", 1_168_427],
    ["09:21.273", 561_273],
    ["21:02.5", 1_262_500],
    ["1:02:30.049", 3_750_049],
    ["5:00", 300_000],
  ])("parses %s", (text, ms) => {
    expect(parseTime(text)).toBe(ms);
  });

  it.each(["", "DNS", "Exh 09:34.509", "19:61.000", "1:60:00.000"])("rejects %j", (text) => {
    expect(parseTime(text)).toBeNull();
  });
});

describe("parsePenaltyCode", () => {
  it("reads age and a zero handicap", () => {
    expect(parsePenaltyCode("Age 15(0)")).toEqual({
      penalties: [],
      averageAge: 15,
      handicapSeconds: 0,
      exhibition: false,
    });
  });

  it("reads a negative fractional handicap", () => {
    const info = parsePenaltyCode("Age 65(-162.4)");
    expect(info.averageAge).toBe(65);
    expect(info.handicapSeconds).toBe(-162.4);
  });

  it("reads timed penalties alongside age", () => {
    expect(parsePenaltyCode("buoy(5s), Age 16(0)").penalties).toEqual([
      { code: "buoy", seconds: 5 },
    ]);
  });

  it("flags exhibition", () => {
    expect(parsePenaltyCode("Age 14(0), Exhib").exhibition).toBe(true);
  });

  it("keeps unrecognized codes as text", () => {
    expect(parsePenaltyCode("Warning").penalties).toEqual([{ code: "Warning", seconds: null }]);
  });

  it("handles empty and missing input", () => {
    expect(parsePenaltyCode("").penalties).toEqual([]);
    expect(parsePenaltyCode(undefined).averageAge).toBeNull();
  });
});

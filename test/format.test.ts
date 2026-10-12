import { describe, expect, it } from "vitest";
import { formatDate, formatMargin, formatStart, formatTime, ordinal } from "../src/lib/format.js";

describe("formatTime", () => {
  it.each([
    [1_168_427, "19:28.4"],
    [561_273, "9:21.3"],
    [3_750_049, "1:02:30.0"],
    [59_960, "1:00.0"],
    [0, "0:00.0"],
  ])("%d -> %s", (ms, text) => {
    expect(formatTime(ms)).toBe(text);
  });
});

describe("formatMargin", () => {
  it("labels the winner and shows others as behind", () => {
    expect(formatMargin(0)).toBe("winner");
    expect(formatMargin(23_400)).toBe("+0:23.4");
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [112, "112th"],
  ])("%d -> %s", (n, text) => {
    expect(ordinal(n)).toBe(text);
  });
});

describe("formatDate", () => {
  it("formats ISO dates and passes others through", () => {
    expect(formatDate("2026-10-11")).toBe("Sun, Oct 11, 2026");
    expect(formatDate("TBD")).toBe("TBD");
  });
});

describe("formatStart", () => {
  it("drops zero seconds and passes other text through", () => {
    expect(formatStart("10:40:00 AM")).toBe("10:40 AM");
    expect(formatStart("9:05:30 PM")).toBe("9:05:30 PM");
    expect(formatStart("After lunch")).toBe("After lunch");
  });
});

describe("gaps and pace", async () => {
  const { formatGap, pacePer500 } = await import("../src/lib/format.js");
  it("formats short gaps in seconds and long ones as times", () => {
    expect(formatGap(940)).toBe("0.9 s");
    expect(formatGap(12_349)).toBe("12.3 s");
    expect(formatGap(75_000)).toBe("1:15.0");
  });
  it("spreads the time over each 500 m", () => {
    expect(pacePer500(1_168_427, 5000)).toBe("1:56.8");
  });
});

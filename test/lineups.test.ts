import { describe, expect, it } from "vitest";
import { lineupKey, parseLineups, seatLabels, setLineup } from "../src/lib/lineups.js";

const now = new Date("2026-10-13T12:00:00Z");

describe("lineups", () => {
  it("reads one rower per line, tidies names and drops blanks", () => {
    const key = lineupKey("12", "101");
    const l = setLineup(
      {},
      key,
      { seats: " A  Rower \n\nB Rower\nC Rower\nD Rower ", cox: " E Cox ", from: "coach" },
      now,
    );
    expect(l[key]).toEqual({
      seats: ["A Rower", "B Rower", "C Rower", "D Rower"],
      cox: "E Cox",
      from: "coach",
      at: now.toISOString(),
    });
  });

  it("clears a lineup when both boxes are blank, and caps seats", () => {
    const key = lineupKey("12", "101");
    const l = setLineup({}, key, { seats: "A\nB", cox: "", from: "coach" }, now);
    expect(setLineup(l, key, { seats: "  \n ", cox: " ", from: "coach" }, now)).toEqual({});
    const many = setLineup(
      {},
      key,
      { seats: Array.from({ length: 12 }, (_, i) => `R${i}`).join("\n"), cox: "", from: "coach" },
      now,
    );
    expect(many[key]!.seats).toHaveLength(9);
  });

  it("labels seats from bow to stroke", () => {
    expect(seatLabels(1)).toEqual(["Sculler"]);
    expect(seatLabels(4)).toEqual(["Bow", "2", "3", "Stroke"]);
  });

  it("parses stored lineups defensively", () => {
    expect(parseLineups(null)).toEqual({});
    expect(
      parseLineups({
        "1:2": { seats: ["A"], cox: "", from: "coach", at: "t" },
        bad: { seats: [1], cox: "", from: "coach", at: "t" },
      }),
    ).toEqual({ "1:2": { seats: ["A"], cox: "", from: "coach", at: "t" } });
  });
});

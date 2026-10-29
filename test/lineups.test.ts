import { describe, expect, it } from "vitest";
import {
  boatSize,
  lineupKey,
  lineupMoved,
  parseLineups,
  seatLabels,
  setLineup,
} from "../src/lib/lineups.js";

const now = new Date("2026-10-13T12:00:00Z");
const seat = (name: string) => ({ name });

describe("lineups", () => {
  it("tidies names and keeps empty seats in place", () => {
    const key = lineupKey("12", "101");
    const l = setLineup(
      {},
      key,
      {
        seats: [{ name: " A  Rower ", rowerId: "a rower" }, seat(""), { ...seat("B"), sub: true }],
        cox: seat(" E Cox "),
        from: "coach",
      },
      now,
    );
    expect(l[key]).toEqual({
      seats: [{ name: "A Rower", rowerId: "a rower" }, { name: "" }, { name: "B", sub: true }],
      cox: { name: "E Cox" },
      from: "coach",
      at: now.toISOString(),
    });
  });

  it("keeps the crew it was saved for and spots when the bow changes crew", () => {
    const key = lineupKey("2", "5");
    const l = setLineup(
      {},
      key,
      { seats: [seat("A")], cox: null, crew: "Lakeview A", from: "coach" },
      now,
    );
    expect(parseLineups(JSON.parse(JSON.stringify(l)))[key]!.crew).toBe("Lakeview A");
    expect(lineupMoved(l[key]!, " lakeview  a ")).toBe(false);
    expect(lineupMoved(l[key]!, "Lakeview B")).toBe(true);
    // Lineups saved before the crew was kept can't be checked.
    const old = setLineup({}, key, { seats: [seat("A")], cox: null, from: "coach" }, now);
    expect(lineupMoved(old[key]!, "Lakeview B")).toBe(false);
  });

  it("clears a lineup with nobody in it, and caps seats", () => {
    const key = lineupKey("12", "101");
    const l = setLineup({}, key, { seats: [seat("A")], cox: null, from: "coach" }, now);
    expect(setLineup(l, key, { seats: [seat(" ")], cox: null, from: "coach" }, now)).toEqual({});
    const many = setLineup(
      {},
      key,
      { seats: Array.from({ length: 12 }, (_, i) => seat(`R${i}`)), cox: null, from: "coach" },
      now,
    );
    expect(many[key]!.seats).toHaveLength(9);
  });

  it("labels seats from bow to stroke", () => {
    expect(seatLabels(1)).toEqual(["Sculler"]);
    expect(seatLabels(4)).toEqual(["Bow", "2", "3", "Stroke"]);
  });

  it.each([
    ["Boys Freshman/Novice Eight 8+", 8, true],
    ["Boys Varsity Four 4+", 4, true],
    ["Girls Freshman/Novice Quad 4x-", 4, false],
    ["Boys Varisty Coxed Quad 4x+", 4, true],
    ["Womens Collegiate/Open Pair 2-", 2, false],
    ["Boys U16/Novice Double 2x", 2, false],
    ["Mens Masters 60+ 1x", 1, false],
    ["Mystery Boat", 8, true],
  ])("sizes %s", (name, rowers, cox) => {
    expect(boatSize(name)).toEqual({ rowers, cox });
  });

  it("parses stored lineups defensively, including older typed-in names", () => {
    expect(parseLineups(null)).toEqual({});
    expect(
      parseLineups({
        "1:2": { seats: ["A"], cox: "", from: "coach", at: "t" },
        "1:3": {
          seats: [{ name: "B", rowerId: "b", sub: true }],
          cox: { name: "C" },
          from: "coach",
          at: "t",
        },
        bad: { seats: [1], cox: "", from: "coach", at: "t" },
      }),
    ).toEqual({
      "1:2": { seats: [{ name: "A" }], cox: null, from: "coach", at: "t" },
      "1:3": {
        seats: [{ name: "B", rowerId: "b", sub: true }],
        cox: { name: "C" },
        from: "coach",
        at: "t",
      },
    });
  });
});

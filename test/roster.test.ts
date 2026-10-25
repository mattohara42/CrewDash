import { describe, expect, it } from "vitest";
import { setLineup, lineupKey, type RegattaLineups } from "../src/lib/lineups.js";
import {
  EMPTY_ROSTER,
  addRower,
  editRowers,
  linkLineups,
  mergeRowers,
  parseRoster,
  relinkLineups,
  seasonRowers,
  squadFits,
} from "../src/lib/roster.js";

const now = new Date("2026-10-13T12:00:00Z");

describe("addRower", () => {
  it("gives a new rower their normalized name as id", () => {
    const { roster, id } = addRower(
      EMPTY_ROSTER,
      { name: " Avery  Example ", squad: "Boys Novice" },
      "2026",
    );
    expect(id).toBe("avery example");
    expect(roster.rowers[0]).toEqual({
      id: "avery example",
      name: "Avery Example",
      squad: "Boys Novice",
      role: "rower",
      seasons: ["2026"],
    });
  });

  it("never duplicates a name that differs only in case or spacing", () => {
    const first = addRower(EMPTY_ROSTER, { name: "Avery Example" }, "2025");
    const again = addRower(first.roster, { name: "avery   EXAMPLE" }, "2026");
    expect(again.id).toBe("avery example");
    expect(again.roster.rowers).toHaveLength(1);
    expect(again.roster.rowers[0]!.seasons).toEqual(["2025", "2026"]);
  });

  it("ignores blank names", () => {
    expect(addRower(EMPTY_ROSTER, { name: "  " }, "2026").id).toBeNull();
  });

  it("keeps a free id when a renamed rower took the obvious one", () => {
    let { roster } = addRower(EMPTY_ROSTER, { name: "Blake Example" }, "2026");
    roster = editRowers(roster, "2026", [
      { id: "blake example", name: "Blake Sample", squad: "", role: "rower", remove: false },
    ]);
    const added = addRower(roster, { name: "Blake Example" }, "2026");
    expect(added.id).toBe("blake example 2");
  });
});

describe("editRowers", () => {
  it("renames, sets squad and role, and removes from one season only", () => {
    let { roster } = addRower(EMPTY_ROSTER, { name: "Casey Example" }, "2025");
    roster = addRower(roster, { name: "Casey Example" }, "2026").roster;
    roster = editRowers(roster, "2026", [
      {
        id: "casey example",
        name: "Casey  Sample",
        squad: "Girls Varsity",
        role: "cox",
        remove: false,
      },
    ]);
    expect(roster.rowers[0]).toMatchObject({
      id: "casey example",
      name: "Casey Sample",
      squad: "Girls Varsity",
      role: "cox",
    });
    roster = editRowers(roster, "2026", [
      { id: "casey example", name: "", squad: "", role: "cox", remove: true },
    ]);
    expect(seasonRowers(roster, "2026")).toEqual([]);
    expect(seasonRowers(roster, "2025")).toHaveLength(1);
  });
});

describe("linkLineups", () => {
  it("links typed-in names to the roster, adding anyone missing", () => {
    let { roster } = addRower(EMPTY_ROSTER, { name: "Avery Example" }, "2026");
    const typed = setLineup(
      {},
      lineupKey("12", "101"),
      {
        seats: [{ name: "avery example" }, { name: "Blake Example" }],
        cox: { name: "Casey Example" },
        from: "coach",
      },
      now,
    );
    const linked = linkLineups(roster, typed, "2026");
    roster = linked.roster;
    const lineup = linked.lineups![lineupKey("12", "101")]!;
    expect(lineup.seats.map((s) => s.rowerId)).toEqual(["avery example", "blake example"]);
    expect(lineup.cox?.rowerId).toBe("casey example");
    expect(roster.rowers.map((r) => [r.name, r.role])).toEqual([
      ["Avery Example", "rower"],
      ["Blake Example", "rower"],
      ["Casey Example", "cox"],
    ]);
    // Already linked: nothing to write.
    expect(linkLineups(roster, linked.lineups!, "2026").lineups).toBeNull();
  });
});

describe("mergeRowers", () => {
  it("folds a misspelling into the right rower and moves their seats", () => {
    let roster = addRower(EMPTY_ROSTER, { name: "Jon Example" }, "2025").roster;
    roster = addRower(roster, { name: "John Example" }, "2026").roster;
    const lineups: RegattaLineups = setLineup(
      {},
      lineupKey("12", "101"),
      { seats: [{ name: "Jon Example", rowerId: "jon example" }], cox: null, from: "coach" },
      now,
    );
    const moved = relinkLineups(lineups, "jon example", "john example", "John Example");
    expect(moved[lineupKey("12", "101")]!.seats[0]).toEqual({
      name: "John Example",
      rowerId: "john example",
    });
    roster = mergeRowers(roster, "jon example", "john example");
    expect(roster.rowers).toEqual([
      {
        id: "john example",
        name: "John Example",
        squad: "",
        role: "rower",
        seasons: ["2025", "2026"],
      },
    ]);
  });
});

describe("squadFits", () => {
  it("matches when every squad word is in the event name", () => {
    expect(squadFits("Boys Novice", "Boys Freshman/Novice Eight 8+")).toBe(true);
    expect(squadFits("Boys Novice", "Boys Varsity Eight 8+")).toBe(false);
    expect(squadFits("", "Boys Varsity Eight 8+")).toBe(false);
  });
});

describe("parseRoster", () => {
  it("keeps well-formed rowers only", () => {
    const good = { id: "a", name: "A", squad: "", role: "rower", seasons: ["2026"] };
    expect(parseRoster({ rowers: [good, { ...good, role: "coach" }, null] })).toEqual({
      rowers: [good],
    });
    expect(parseRoster(null)).toEqual(EMPTY_ROSTER);
  });
});

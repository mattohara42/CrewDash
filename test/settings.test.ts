import { describe, expect, it } from "vitest";
import {
  EMPTY_SETTINGS,
  addAlias,
  effectiveClub,
  eventKey,
  mergeEvent,
  parseSettings,
  removeAlias,
  unmergeEvent,
} from "../src/lib/settings.js";

const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };

describe("aliases", () => {
  it("adds names once, ignoring case and spacing", () => {
    let s = addAlias(EMPTY_SETTINGS, "Lakeview RC");
    s = addAlias(s, "  lakeview   rc ");
    expect(s.extraAliases).toEqual(["Lakeview RC"]);
  });

  it("ignores blank names", () => {
    expect(addAlias(EMPTY_SETTINGS, "  ").extraAliases).toEqual([]);
  });

  it("removes names", () => {
    expect(
      removeAlias(addAlias(EMPTY_SETTINGS, "Lakeview RC"), "LAKEVIEW RC").extraAliases,
    ).toEqual([]);
  });

  it("merges extra names into the club without duplicating club.json's", () => {
    const s = { ...EMPTY_SETTINGS, extraAliases: ["lakeview rowing club", "Lakeview - EXH"] };
    expect(effectiveClub(club, s).aliases).toEqual(["Lakeview Rowing Club", "Lakeview - EXH"]);
  });
});

describe("event grouping", () => {
  it("keys events by normalized name", () => {
    expect(eventKey("Mens  U17 4+", EMPTY_SETTINGS)).toBe("mens u17 4+");
  });

  it("groups a renamed event under another", () => {
    const s = mergeEvent(EMPTY_SETTINGS, "Novice 8+", "Mens HS Novice 8+");
    expect(eventKey("novice 8+", s)).toBe("mens hs novice 8+");
    expect(eventKey("Mens HS Novice 8+", s)).toBe("mens hs novice 8+");
  });

  it("never chains merges", () => {
    let s = mergeEvent(EMPTY_SETTINGS, "A 8+", "B 8+");
    s = mergeEvent(s, "B 8+", "C 8+");
    expect(eventKey("A 8+", s)).toBe("c 8+");
    expect(eventKey("B 8+", s)).toBe("c 8+");
  });

  it("refuses merging an event into itself", () => {
    expect(mergeEvent(EMPTY_SETTINGS, "A 8+", " a  8+ ")).toBe(EMPTY_SETTINGS);
  });

  it("undoes a merge", () => {
    const s = unmergeEvent(
      mergeEvent(EMPTY_SETTINGS, "Novice 8+", "Mens HS Novice 8+"),
      "NOVICE 8+",
    );
    expect(eventKey("Novice 8+", s)).toBe("novice 8+");
  });
});

describe("parseSettings", () => {
  it("defaults missing or malformed values", () => {
    expect(parseSettings(null)).toEqual(EMPTY_SETTINGS);
    expect(parseSettings({ extraAliases: ["ok", 3], eventAliases: { a: "b", c: 4 } })).toEqual({
      extraAliases: ["ok"],
      eventAliases: { a: "b" },
    });
  });
});

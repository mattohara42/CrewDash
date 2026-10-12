import { describe, expect, it } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { resultsCsv } from "../src/lib/csv.js";
import { parseNotes, setNote } from "../src/lib/notes.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };
const now = new Date("2026-10-12T15:00:00Z");

describe("notes", () => {
  it("sets, trims and clears notes", () => {
    const notes = setNote({}, "womens u19 8+", "  Rough start  ", "coach", now);
    expect(notes).toEqual({
      "womens u19 8+": { text: "Rough start", from: "coach", at: now.toISOString() },
    });
    expect(setNote(notes, "womens u19 8+", "  ", "coach", now)).toEqual({});
  });

  it("parses stored notes defensively", () => {
    expect(
      parseNotes({ a: { text: "x", from: "coach", at: "t" }, b: { text: 1 }, c: null }),
    ).toEqual({
      a: { text: "x", from: "coach", at: "t" },
    });
    expect(parseNotes("junk")).toEqual({});
  });
});

describe("resultsCsv", () => {
  it("writes one row per club boat with a header", () => {
    const record = { regatta: normalizeRegatta("r1", fixture as RawRegattaResults), fetchedAt: "" };
    const lines = resultsCsv([record], club).trim().split("\r\n");
    expect(lines[0]).toBe(
      "Date,Regatta,Event,Bow,Crew,Stroke,Place,Crews placed,Result,Adjusted time,Raw time,Behind winner,Penalties",
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(
      /^2026-10-11,Made-up Head of the Lake,Womens U19 8\+,101,Lakeview Rowing Club,/,
    );
  });

  it("quotes commas and defuses formulas", () => {
    const raw = structuredClone(fixture) as RawRegattaResults;
    raw.regattaInfo.Title = "=HYPERLINK(1), the regatta";
    const csv = resultsCsv([{ regatta: normalizeRegatta("r1", raw), fetchedAt: "" }], club);
    expect(csv).toContain(`"'=HYPERLINK(1), the regatta"`);
  });
});

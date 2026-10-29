import { describe, expect, it } from "vitest";
import type { Entry, Event, Regatta } from "../src/crewtimer/normalize.js";
import { resultsChangedAt, staleNote } from "../src/lib/stale.js";
import type { StoredRegatta } from "../src/lib/store.js";

const TZ = "America/New_York";
const DATE = "2026-10-31";
// 9:30 AM, 10:00 AM and 1:00 PM in New York on the race day.
const at = (hhmm: string) => new Date(`${DATE}T${hhmm}:00-04:00`);

const entry = (bow: string, done: boolean, startedAt: number | null = null): Entry => ({
  bow,
  crew: `Crew ${bow}`,
  crewAbbrev: "",
  stroke: "",
  place: done ? 1 : null,
  status: done ? "finished" : "pending",
  rawTimeMs: done ? 1_000_000 : null,
  adjustedTimeMs: done ? 1_000_000 : null,
  adjustedTimeText: "",
  penalties: [],
  averageAge: null,
  handicapSeconds: null,
  startedAt,
});

const event = (num: string, start: string, entries: Entry[], official = false): Event => ({
  num,
  name: `Event ${num}`,
  raceType: "Head",
  start,
  official,
  entries,
});

const regatta = (events: Event[]): Regatta => ({
  id: "r1",
  title: "Test Head",
  date: DATE,
  raceType: "Head",
  resultsPendingOfficial: false,
  events,
});

const record = (events: Event[], extra: Partial<StoredRegatta> = {}): StoredRegatta => ({
  regatta: regatta(events),
  fetchedAt: at("12:00").toISOString(),
  ...extra,
});

describe("staleNote", () => {
  const now = at("12:00");

  it("is quiet before racing starts and while results keep coming", () => {
    const early = record([event("1", "9:30 AM", [entry("1", false)])], {
      fetchedAt: at("08:00").toISOString(),
    });
    expect(staleNote(early, DATE, TZ, at("08:00"))).toBeNull();
    const fresh = record([event("1", "9:30 AM", [entry("1", false)])], {
      resultsChangedAt: at("11:30").toISOString(),
    });
    expect(staleNote(fresh, DATE, TZ, now)).toBeNull();
  });

  it("flags a regatta that never posts", () => {
    const r = record([event("1", "11:00 AM", [entry("1", false)])]);
    expect(staleNote(r, DATE, TZ, now)).toBe(
      "CrewTimer hasn't posted any results yet. Event 1 was due at 11:00 AM and is still " +
        "waiting for results. The timing desk may be running behind.",
    );
  });

  it("flags a regatta that goes quiet, measured from the real start", () => {
    const r = record(
      [
        event("1", "9:30 AM", [entry("1", true)]),
        // Due at 10:00, started at 11:30: not late yet at noon. Events 3 and 4 are.
        event("2", "10:00 AM", [entry("2", false, 11 * 60 + 30)]),
        event("3", "10:15 AM", [entry("3", false, 10 * 60 + 20)]),
        event("4", "10:30 AM", [entry("4", true), entry("5", false)]),
      ],
      { resultsChangedAt: at("10:00").toISOString() },
    );
    expect(staleNote(r, DATE, TZ, now)).toBe(
      "No new results from CrewTimer since 10:00 AM. Event 3 started at 10:20 AM and is " +
        "still waiting for results, as is 1 other event. The timing desk may be running behind.",
    );
  });

  it("ignores official events and events still within the allowance", () => {
    const r = record([
      event("1", "9:30 AM", [entry("1", false)], true),
      event("2", "11:30 AM", [entry("2", false)]),
    ]);
    expect(staleNote(r, DATE, TZ, now)).toBeNull();
  });

  it("says when CrewDash itself has stopped refreshing", () => {
    const r = record([event("1", "9:30 AM", [entry("1", true)])], {
      fetchedAt: at("11:00").toISOString(),
    });
    expect(staleNote(r, DATE, TZ, now)).toBe(
      "CrewDash last checked CrewTimer at 11:00 AM, so results here may be behind.",
    );
  });
});

describe("resultsChangedAt", () => {
  const before = record([event("1", "9:30 AM", [entry("1", false)])], {
    resultsChangedAt: "earlier",
  });

  it("moves only when the number of results changes", () => {
    const now = at("10:00");
    expect(resultsChangedAt(null, before.regatta, now)).toBeUndefined();
    expect(resultsChangedAt(before, before.regatta, now)).toBe("earlier");
    const after = regatta([event("1", "9:30 AM", [entry("1", true)])]);
    expect(resultsChangedAt(before, after, now)).toBe(now.toISOString());
  });
});

import { describe, expect, it } from "vitest";
import { normalizeRegatta, type Regatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { recordResultTimes, speedSummary } from "../src/lib/speed.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const done = normalizeRegatta("r1", fixture as RawRegattaResults);
// The same regatta before any results: every boat pending.
const pending: Regatta = {
  ...done,
  events: done.events.map((e) => ({
    ...e,
    entries: e.entries.map((x) => ({
      ...x,
      status: "pending" as const,
      place: null,
      adjustedTimeMs: null,
    })),
  })),
};
const at = (iso: string) => new Date(iso);

describe("recordResultTimes", () => {
  it("records nothing the first time a regatta is added", () => {
    expect(recordResultTimes(null, done, at("2026-10-11T14:00:00Z"))).toBeUndefined();
  });

  it("records when results first appear and keeps the first time", () => {
    const prev = { regatta: pending, fetchedAt: "" };
    const times = recordResultTimes(prev, done, at("2026-10-11T13:20:00Z"));
    expect(times?.["12"]).toEqual({
      first: "2026-10-11T13:20:00.000Z",
      all: "2026-10-11T13:20:00.000Z",
    });
    const later = recordResultTimes(
      { regatta: done, fetchedAt: "", resultTimes: times },
      done,
      at("2026-10-11T15:00:00Z"),
    );
    expect(later).toEqual(times);
  });

  it("doesn't invent times for results that were already there", () => {
    expect(
      recordResultTimes({ regatta: done, fetchedAt: "" }, done, at("2026-10-11T15:00:00Z")),
    ).toBeUndefined();
  });
});

describe("speedSummary", () => {
  it("gives median minutes from each event's start", () => {
    // Event 12 starts 9:00 AM and event 13 at 9:30 AM Eastern (13:00Z and 13:30Z).
    const record = {
      regatta: done,
      fetchedAt: "",
      resultTimes: {
        "12": { first: "2026-10-11T13:20:00Z", all: "2026-10-11T13:30:00Z" },
        "13": { first: "2026-10-11T13:40:00Z" },
      },
    };
    expect(speedSummary(record, "America/New_York")).toEqual({
      events: 2,
      firstMin: 15,
      allMin: 30,
    });
  });
});

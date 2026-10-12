import { describe, expect, it } from "vitest";
import { normalizeRegatta, type Regatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { resultNotices } from "../src/lib/notify.js";
import { EMPTY_SETTINGS } from "../src/lib/settings.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const done = normalizeRegatta("r1", fixture as RawRegattaResults);
const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };
const withExh = { ...club, aliases: [...club.aliases, "Lakeview Rowing Club - EXH"] };

// Returns a copy with one entry changed, found by bow number.
function withEntry(regatta: Regatta, bow: string, change: object): Regatta {
  return {
    ...regatta,
    events: regatta.events.map((ev) => ({
      ...ev,
      entries: ev.entries.map((en) => (en.bow === bow ? { ...en, ...change } : en)),
    })),
  };
}

const pending = { status: "pending", place: null, adjustedTimeMs: null } as const;

describe("resultNotices", () => {
  it("never notifies on a regatta's first fetch", () => {
    expect(resultNotices(null, done, club, EMPTY_SETTINGS)).toEqual([]);
  });

  it("notifies nothing when results haven't changed", () => {
    expect(resultNotices(done, done, club, EMPTY_SETTINGS)).toEqual([]);
  });

  it("notifies once an event's last boat finishes", () => {
    // Event 12 is waiting on another club's boat, so it isn't complete yet.
    const before = withEntry(done, "102", pending);
    expect(resultNotices(before, done, club, EMPTY_SETTINGS)).toEqual([
      {
        regattaId: "r1",
        eventKey: "womens u19 8+",
        kind: "result",
        title: "Made-up Head of the Lake",
        body: "Womens U19 8+: bow 101 1st of 2, 19:28.4",
        url: "/regatta/r1",
      },
    ]);
  });

  it("waits while any boat in the event is still on the water", () => {
    // Event 13 has a boat with no result in the fixture.
    const still = resultNotices(withEntry(done, "120", pending), done, club, EMPTY_SETTINGS);
    expect(still).toEqual([]);

    const finished = withEntry(done, "122", { status: "dns" });
    expect(resultNotices(done, finished, club, EMPTY_SETTINGS)).toMatchObject([
      {
        eventKey: "mens masters 60+ 1x",
        kind: "result",
        body: "Mens Masters 60+ 1x: bow 120 1st of 1, 59:47.6",
      },
    ]);
  });

  it("sends an update when a finished result changes", () => {
    const corrected = withEntry(done, "101", { place: 2, adjustedTimeMs: 1_190_000 });
    const [notice] = resultNotices(done, corrected, club, EMPTY_SETTINGS);
    expect(notice).toMatchObject({ kind: "update", eventKey: "womens u19 8+" });
    expect(notice?.body).toBe("Updated: Womens U19 8+: bow 101 2nd of 2, 19:50.0");
  });

  it("ignores changes to other clubs' boats unless they change the club's result", () => {
    // Slower second place: the field and the club's place stay the same.
    const slower = withEntry(done, "102", { adjustedTimeMs: 1_200_000 });
    expect(resultNotices(done, slower, club, EMPTY_SETTINGS)).toEqual([]);
  });

  it("describes exhibition boats without a place", () => {
    const before = withEntry(done, "102", pending);
    expect(resultNotices(before, done, withExh, EMPTY_SETTINGS)[0]?.body).toBe(
      "Womens U19 8+: bow 101 1st of 2, 19:28.4; bow 103 exhibition, 21:02.5",
    );
  });

  it("never includes rowers' names", () => {
    const before = withEntry(withEntry(done, "102", pending), "122", pending);
    for (const notice of resultNotices(before, done, withExh, EMPTY_SETTINGS)) {
      expect(notice.body).not.toMatch(/Example|Placeholder|Fictional/);
    }
  });
});

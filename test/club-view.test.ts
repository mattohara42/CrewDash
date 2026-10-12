import { describe, expect, it } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { clubEvents, clubSummary, nearMatches } from "../src/lib/club-view.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const regatta = normalizeRegatta("r1", fixture as RawRegattaResults);
const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club"] };
const withExh = { ...club, aliases: [...club.aliases, "Lakeview Rowing Club - EXH"] };

describe("clubEvents", () => {
  it("keeps only events and boats from the club", () => {
    const events = clubEvents(regatta, club);
    expect(events.map((e) => e.event.num)).toEqual(["12", "13"]);
    expect(events[0]?.boats.map((b) => b.entry.bow)).toEqual(["101"]);
  });

  it("counts only crews that finished and could place", () => {
    // Event 12: two finished, one exhibition, one DNS.
    expect(clubEvents(regatta, club)[0]?.fieldSize).toBe(2);
  });

  it("computes the margin behind the winner", () => {
    const winner = clubEvents(regatta, club)[0]?.boats[0];
    expect(winner?.marginMs).toBe(0);
  });

  it("ranks exhibition boats unofficially and lists them after placed boats", () => {
    const [placed, exhibition] = clubEvents(regatta, withExh)[0]!.boats;
    expect(placed?.entry.bow).toBe("101");
    expect(exhibition).toMatchObject({
      entry: { bow: "103", status: "exhibition", place: null },
      // 21:02.5 is slower than both finishers.
      wouldHavePlaced: 3,
      marginMs: 1_262_500 - 1_168_427,
    });
  });

  it("gives non-exhibition boats no unofficial place", () => {
    expect(clubEvents(regatta, club)[0]?.boats[0]?.wouldHavePlaced).toBeNull();
  });
});

describe("clubSummary", () => {
  it("counts boats, wins and top-three finishes", () => {
    expect(clubSummary(clubEvents(regatta, withExh))).toEqual({ boats: 3, wins: 2, podiums: 2 });
  });
});

describe("nearMatches", () => {
  it("lists names that contain an alias without matching one", () => {
    expect(nearMatches(regatta, club)).toEqual(["Lakeview Rowing Club - EXH"]);
    expect(nearMatches(regatta, withExh)).toEqual([]);
  });
});

describe("gaps between crews", () => {
  const entry = (crew: string, bow: string, place: number, time: string) => ({
    Bow: bow,
    Crew: crew,
    Place: place,
    RawTime: time,
    AdjTime: time,
  });
  const raw: RawRegattaResults = {
    regattaInfo: { Title: "Made-up Sprints", Date: "2026-05-02" },
    results: [
      {
        Event: "1 Womens U17 4+",
        EventNum: "1",
        entries: [
          entry("Lakeview Rowing Club", "1", 1, "07:00.000"),
          entry("Hillside Boat Club", "2", 2, "07:02.500"),
          entry("Hillside Boat Club", "3", 3, "07:05.000"),
          entry("Hillside Boat Club", "4", 4, "07:06.000"),
          entry("Lakeview Rowing Club", "5", 5, "07:06.900"),
        ],
      },
    ],
  };
  const [event] = clubEvents(normalizeRegatta("r2", raw), club);

  it("gives the winner its winning margin", () => {
    expect(event?.boats[0]).toMatchObject({
      wonByMs: 2500,
      gapUpMs: null,
      offThirdMs: null,
      beaten: 4,
    });
  });

  it("gives other boats the gap one place up and to third", () => {
    expect(event?.boats[1]).toMatchObject({
      wonByMs: null,
      gapUpMs: 900,
      offThirdMs: 1900,
      beaten: 0,
    });
  });
});

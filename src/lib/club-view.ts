import { matchClub, type ClubConfig } from "../club.js";
import type { Entry, Event, Regatta } from "../crewtimer/normalize.js";

export interface ClubBoat {
  entry: Entry;
  // Behind the event winner's adjusted time, when both have one.
  marginMs: number | null;
  // For exhibition boats: where their time would have ranked among eligible
  // crews. Unofficial, never a real place.
  wouldHavePlaced: number | null;
}

export interface ClubEvent {
  event: Event;
  // Crews that finished and were eligible to place.
  fieldSize: number;
  boats: ClubBoat[];
}

export interface ClubSummary {
  boats: number;
  wins: number;
  podiums: number;
}

function boatOrder(a: ClubBoat, b: ClubBoat): number {
  const rank = (boat: ClubBoat) =>
    boat.entry.place ?? (boat.entry.status === "exhibition" ? 1000 : 2000);
  return rank(a) - rank(b);
}

/** The events this club raced in, with only the club's boats in each. */
export function clubEvents(regatta: Regatta, club: ClubConfig): ClubEvent[] {
  const result: ClubEvent[] = [];
  for (const event of regatta.events) {
    const ours = event.entries.filter((e) => matchClub(e.crew, club) === "match");
    if (ours.length === 0) continue;

    const finishedTimes = event.entries
      .filter((e) => e.status === "finished" && e.adjustedTimeMs !== null)
      .map((e) => e.adjustedTimeMs!);
    const winnerMs = finishedTimes.length ? Math.min(...finishedTimes) : null;

    const boats = ours.map((entry): ClubBoat => {
      const timed = entry.adjustedTimeMs !== null && winnerMs !== null;
      return {
        entry,
        marginMs: timed ? entry.adjustedTimeMs! - winnerMs! : null,
        wouldHavePlaced:
          entry.status === "exhibition" && entry.adjustedTimeMs !== null
            ? 1 + finishedTimes.filter((t) => t < entry.adjustedTimeMs!).length
            : null,
      };
    });

    result.push({ event, fieldSize: finishedTimes.length, boats: boats.sort(boatOrder) });
  }
  return result;
}

export function clubSummary(events: ClubEvent[]): ClubSummary {
  const boats = events.flatMap((e) => e.boats);
  return {
    boats: boats.length,
    wins: boats.filter((b) => b.entry.place === 1).length,
    podiums: boats.filter((b) => b.entry.place !== null && b.entry.place <= 3).length,
  };
}

/** Crew names that look like this club but aren't one of its aliases, for an admin to review. */
export function nearMatches(regatta: Regatta, club: ClubConfig): string[] {
  const names = new Set<string>();
  for (const event of regatta.events) {
    for (const entry of event.entries) {
      if (matchClub(entry.crew, club) === "near") names.add(entry.crew);
    }
  }
  return [...names].sort();
}

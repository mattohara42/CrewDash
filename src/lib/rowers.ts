import { normalizeName, type ClubIdentity } from "../club.js";
import type { Event } from "../crewtimer/normalize.js";
import { clubEvents, type ClubBoat } from "./club-view.js";
import { lineupKey, seatLabels, type RegattaLineups } from "./lineups.js";
import type { StoredRegatta } from "./store.js";

// Rower pages, built from coach-entered lineups joined to results by event and bow number.
// Names are typed by coaches, so the same spelling (ignoring case and spacing) is the same rower.

export interface RowerRace {
  record: StoredRegatta;
  event: Event;
  fieldSize: number;
  boat: ClubBoat;
  seat: string;
}

export interface Rower {
  key: string;
  // The spelling from the most recent race.
  name: string;
  races: RowerRace[];
}

export function rowerKey(name: string): string {
  return normalizeName(name);
}

/** Everyone in a lineup, with their races newest first, sorted by name. */
export function buildRowers(
  records: StoredRegatta[],
  lineupsById: Map<string, RegattaLineups>,
  club: ClubIdentity,
): Rower[] {
  const rowers = new Map<string, Rower>();
  const newestFirst = [...records].sort((a, b) => b.regatta.date.localeCompare(a.regatta.date));
  for (const record of newestFirst) {
    const lineups = lineupsById.get(record.regatta.id);
    if (!lineups) continue;
    for (const { event, fieldSize, boats } of clubEvents(record.regatta, club)) {
      for (const boat of boats) {
        const lineup = lineups[lineupKey(event.num, boat.entry.bow)];
        if (!lineup) continue;
        const labels = seatLabels(lineup.seats.length);
        const people = [
          ...lineup.seats.map((name, i) => ({ name, seat: labels[i]! })),
          ...(lineup.cox ? [{ name: lineup.cox, seat: "Cox" }] : []),
        ];
        for (const { name, seat } of people) {
          const key = rowerKey(name);
          if (!key) continue;
          const rower = rowers.get(key) ?? { key, name, races: [] };
          rower.races.push({ record, event, fieldSize, boat, seat });
          rowers.set(key, rower);
        }
      }
    }
  }
  return [...rowers.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function rowerStats(rower: Rower) {
  const places = rower.races.map((r) => r.boat.entry.place).filter((p): p is number => p !== null);
  return {
    races: rower.races.length,
    wins: places.filter((p) => p === 1).length,
    podiums: places.filter((p) => p <= 3).length,
  };
}

/** Lineups for every stored regatta, read in parallel. */
export async function allLineups(
  records: StoredRegatta[],
  store: { getLineups(id: string): Promise<RegattaLineups> },
): Promise<Map<string, RegattaLineups>> {
  const found = await Promise.all(
    records.map(async (r) => [r.regatta.id, await store.getLineups(r.regatta.id)] as const),
  );
  return new Map(found);
}

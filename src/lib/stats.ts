import type { ClubIdentity } from "../club.js";
import { clubEvents, type ClubBoat } from "./club-view.js";
import { historyByEvent, regattaYear } from "./history.js";
import type { Settings } from "./settings.js";
import type { StoredRegatta } from "./store.js";

// Numbers for the season dashboard and the year-over-year chart.

export const PLACE_BUCKETS = ["1st", "2nd", "3rd", "4th", "5th+"] as const;
export type PlaceBucket = (typeof PLACE_BUCKETS)[number];

export interface SeasonStats {
  regattas: number;
  boats: number;
  wins: number;
  podiums: number;
  // Placed boats only. Exhibition, DNS and the like aren't counted here.
  places: Record<PlaceBucket, number>;
}

export function bucket(place: number): PlaceBucket {
  return place >= 5 ? "5th+" : PLACE_BUCKETS[place - 1]!;
}

export function seasonStats(records: StoredRegatta[], club: ClubIdentity): SeasonStats {
  const places = Object.fromEntries(PLACE_BUCKETS.map((b) => [b, 0])) as Record<
    PlaceBucket,
    number
  >;
  let boats = 0;
  let regattas = 0;
  for (const { regatta } of records) {
    const raced = clubEvents(regatta, club).flatMap((e) => e.boats);
    if (raced.length > 0) regattas++;
    boats += raced.length;
    for (const { entry } of raced) {
      if (entry.place !== null && entry.place >= 1) places[bucket(entry.place)]++;
    }
  }
  return {
    regattas,
    boats,
    wins: places["1st"],
    podiums: places["1st"] + places["2nd"] + places["3rd"],
    places,
  };
}

export interface YearMargin {
  year: string;
  regattaId: string;
  // The club's closest finish behind the winner in that event. 0 means a win.
  marginMs: number;
  place: number;
  fieldSize: number;
}

export interface MarginComparison {
  eventName: string;
  older: YearMargin;
  newer: YearMargin;
}

function bestPlaced(boats: ClubBoat[]): ClubBoat | null {
  const placed = boats.filter((b) => b.entry.place !== null && b.marginMs !== null);
  return placed.sort((a, b) => a.marginMs! - b.marginMs!)[0] ?? null;
}

/**
 * For each event the club placed in during both of the two most recent years of a
 * series, its closest finish behind the winner each year. Exhibition boats are left
 * out because their lineup wasn't the usual one.
 */
export function marginComparison(
  seriesRegattas: StoredRegatta[],
  club: ClubIdentity,
  settings: Settings,
): MarginComparison[] {
  const years = [...new Set(seriesRegattas.map((r) => regattaYear(r.regatta)))].sort().reverse();
  if (years.length < 2) return [];
  const [newerYear, olderYear] = years as [string, string];

  const result: MarginComparison[] = [];
  for (const group of historyByEvent(seriesRegattas, club, settings)) {
    const byYear = new Map<string, YearMargin>();
    for (const row of group.rows) {
      const year = regattaYear(row.regatta);
      const best = bestPlaced(row.boats);
      if (!best || byYear.has(year)) continue;
      byYear.set(year, {
        year,
        regattaId: row.regatta.id,
        marginMs: best.marginMs!,
        place: best.entry.place!,
        fieldSize: row.fieldSize,
      });
    }
    const newer = byYear.get(newerYear);
    const older = byYear.get(olderYear);
    if (newer && older) result.push({ eventName: group.name, older, newer });
  }
  return result;
}

/** What a season drill-down shows: every boat, wins, top three, or one finishing place. */
export type BoatFilter = "all" | "wins" | "top3" | PlaceBucket;

export function parseBoatFilter(value: string | null): BoatFilter {
  const allowed: string[] = ["all", "wins", "top3", ...PLACE_BUCKETS];
  return value && allowed.includes(value) ? (value as BoatFilter) : "all";
}

function matches(place: number | null, filter: BoatFilter): boolean {
  if (filter === "all") return true;
  if (place === null || place < 1) return false;
  if (filter === "wins") return place === 1;
  if (filter === "top3") return place <= 3;
  return bucket(place) === filter;
}

/** The season's club boats that match a filter, grouped by regatta, newest regatta first. */
export function seasonBoats(records: StoredRegatta[], club: ClubIdentity, filter: BoatFilter) {
  return [...records]
    .sort((a, b) => b.regatta.date.localeCompare(a.regatta.date))
    .map((record) => ({
      record,
      rows: clubEvents(record.regatta, club).flatMap(({ event, fieldSize, boats }) =>
        boats
          .filter((b) => matches(b.entry.place, filter))
          .map((boat) => ({ event, fieldSize, boat })),
      ),
    }))
    .filter((g) => g.rows.length > 0);
}

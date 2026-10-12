import type { ClubIdentity } from "../club.js";
import { clubEvents } from "./club-view.js";
import { regattaYear, regattasInSeries, regattasInYear, seriesKey, seriesName } from "./history.js";
import type { Settings } from "./settings.js";
import { marginComparison, seasonStats, type MarginComparison } from "./stats.js";
import type { StoredRegatta } from "./store.js";
import { venueForSeries, type VenueData } from "./venues.js";

// Club-level summaries for sharing: a weekend recap and an end-of-season Wrapped.
// They name events and places, never rowers, so they can be posted publicly.

export interface Finish {
  event: string;
  place: number;
  fieldSize: number;
}

export interface Gain {
  event: string;
  // How much closer to the winner than last year.
  savedMs: number;
  from: Finish;
  to: Finish;
}

function gains(comparisons: MarginComparison[], regattaIds: Set<string>): Gain[] {
  return comparisons
    .filter((c) => regattaIds.has(c.newer.regattaId) && c.newer.marginMs < c.older.marginMs)
    .map((c) => ({
      event: c.eventName,
      savedMs: c.older.marginMs - c.newer.marginMs,
      from: { event: c.eventName, place: c.older.place, fieldSize: c.older.fieldSize },
      to: { event: c.eventName, place: c.newer.place, fieldSize: c.newer.fieldSize },
    }))
    .sort((a, b) => b.savedMs - a.savedMs);
}

/** Medals first, then the rest by place relative to field size. */
function finishes(record: StoredRegatta, club: ClubIdentity): Finish[] {
  return clubEvents(record.regatta, club)
    .flatMap(({ event, fieldSize, boats }) =>
      boats
        .filter((b) => b.entry.place !== null)
        .map((b) => ({ event: event.name, place: b.entry.place!, fieldSize })),
    )
    .sort((a, b) => a.place / a.fieldSize - b.place / b.fieldSize || a.place - b.place);
}

/** Year over year in the same series, up to this regatta. */
function seriesGains(
  record: StoredRegatta,
  records: StoredRegatta[],
  club: ClubIdentity,
  settings: Settings,
) {
  const upTo = regattasInSeries(records, seriesKey(seriesName(record))).filter(
    (r) => r.regatta.date <= record.regatta.date,
  );
  return gains(marginComparison(upTo, club, settings), new Set([record.regatta.id]));
}

export function regattaRecap(
  record: StoredRegatta,
  records: StoredRegatta[],
  club: ClubIdentity,
  settings: Settings,
) {
  const stats = seasonStats([record], club);
  const all = finishes(record, club);
  return {
    boats: stats.boats,
    wins: stats.wins,
    podiums: stats.podiums,
    medals: all.filter((f) => f.place <= 3).sort((a, b) => a.place - b.place),
    best: all.slice(0, 3),
    gains: seriesGains(record, records, club, settings).slice(0, 3),
  };
}

export function seasonWrapped(
  year: string,
  records: StoredRegatta[],
  club: ClubIdentity,
  settings: Settings,
  venues: VenueData,
) {
  const season = regattasInYear(records, year);
  const stats = seasonStats(season, club);
  let metres = 0;
  let unmeasured = 0;
  for (const record of season) {
    const length = venueForSeries(venues, seriesName(record))?.courseLengthM ?? null;
    const raced = clubEvents(record.regatta, club)
      .flatMap((e) => e.boats)
      .filter((b) => b.entry.status === "finished" || b.entry.status === "exhibition").length;
    if (length) metres += raced * length;
    else unmeasured += raced;
  }
  const best = season
    .flatMap((r) => finishes(r, club))
    .sort((a, b) => a.place - b.place || b.fieldSize - a.fieldSize)[0];
  const ids = new Set(season.map((r) => r.regatta.id));
  const seriesSeen = new Set(season.map((r) => seriesKey(seriesName(r))));
  const improved = [...seriesSeen]
    .flatMap((key) =>
      gains(
        marginComparison(
          regattasInSeries(records, key).filter((r) => regattaYear(r.regatta) <= year),
          club,
          settings,
        ),
        ids,
      ),
    )
    .sort((a, b) => b.savedMs - a.savedMs)[0];
  return {
    ...stats,
    km: Math.round(metres / 100) / 10,
    // Boats raced at venues with no course length, so km is a floor.
    unmeasured,
    best: best ?? null,
    improved: improved ?? null,
  };
}

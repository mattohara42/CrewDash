import { fetchChangeMarker, fetchRegattaResults } from "../crewtimer/fetch.js";
import { PARSER_VERSION, addDays, normalizeRegatta, regattaDates } from "../crewtimer/normalize.js";
import { conditionsFor } from "./conditions.js";
import { club } from "./config.js";
import { seriesName } from "./history.js";
import { recordResultTimes } from "./speed.js";
import type { RegattaStore, StoredRegatta } from "./store.js";
import { localDate } from "./today.js";
import { venueForSeries } from "./venues.js";

// CrewTimer's "pending official" flag can stay set forever, so regattas are
// re-fetched from the day before race day until this many days after it.
const REFRESH_DAYS_AFTER = 3;
// Older regattas parsed by an earlier version are re-fetched a few at a time, so one run
// stays well inside the scheduled function's time limit.
const STALE_PER_RUN = 5;
// The scheduled refresh runs every 5 minutes. Off race day (the day before, and the days
// after) results rarely change, so a regatta is only fetched on the run in each hour's
// first 5 minutes.
const OFF_DAY_MINUTES = 5;
// The schedule fires every 5 minutes around the clock, because clubs race in every time
// zone. Runs outside these local hours end at once. They're wide so a regatta three time
// zones away still fits: a 7:00 start in Boston is 4:00 in Los Angeles, and a 17:00 finish
// in California is 20:00 in New York. Further away than that, early or late racing is missed.
const FIRST_HOUR = 4;
const LAST_HOUR = 23;

export interface Fetched {
  record: StoredRegatta;
  // The stored copy before this fetch, or null the first time.
  previous: StoredRegatta | null;
}

export async function fetchAndStore(
  id: string,
  store: RegattaStore,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
  // CrewTimer's change marker at this fetch, kept to compare with the next one.
  marker?: string | null,
): Promise<Fetched> {
  const regatta = normalizeRegatta(id, await fetchRegattaResults(id, fetchImpl));
  // Keep what an admin set, such as the series name, across refreshes.
  const previous = await store.get(id);
  const record: StoredRegatta = {
    ...previous,
    regatta,
    fetchedAt: now.toISOString(),
    parserVersion: PARSER_VERSION,
    resultTimes: recordResultTimes(previous, regatta, now),
    // A manual refresh passes no marker, which clears the old one so the next check starts fresh.
    marker: marker ?? undefined,
  };
  await store.put(record);
  return { record, previous };
}

/** Whole days from a race date to today in the club's time zone. */
function dayOffset(date: string, timeZone: string, now: Date): number {
  const race = Date.parse(`${date}T00:00:00Z`);
  const today = Date.parse(`${localDate(now, timeZone)}T00:00:00Z`);
  return Math.round((today - race) / 86_400_000);
}

/** True while a regatta's results may still be changing. */
export function isRecent(date: string, timeZone: string, now: Date = new Date()): boolean {
  const offset = dayOffset(date, timeZone, now);
  return Number.isFinite(offset) && offset >= -1 && offset <= REFRESH_DAYS_AFTER;
}

/** True when one of these race days is today in the club's time zone. */
export function isRaceDay(dates: string[], timeZone: string, now: Date): boolean {
  return dates.includes(localDate(now, timeZone));
}

/** True during the hours a scheduled refresh does anything, in the club's time zone. */
export function isRefreshHour(timeZone: string, now: Date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  return hour >= FIRST_HOUR && hour <= LAST_HOUR;
}

/**
 * Logs whether CrewTimer's change marker moved when the results did. "Marker missed" means
 * results changed but the marker didn't, so skipping on the marker would have lost them.
 */
function logMarker({ record, previous }: Fetched): void {
  if (!previous?.marker || !record.marker) return;
  const markerChanged = previous.marker !== record.marker;
  const resultsChanged = JSON.stringify(previous.regatta) !== JSON.stringify(record.regatta);
  const verdict =
    resultsChanged && !markerChanged
      ? "marker missed a change"
      : resultsChanged
        ? "both changed"
        : markerChanged
          ? "marker changed, results same"
          : "both same";
  console.log(`Marker check ${record.regatta.id}: ${verdict}`);
}

/** True when the stored copy came from an older parser and needs fetching again. */
export function isStale(record: Pick<StoredRegatta, "parserVersion">): boolean {
  return (record.parserVersion ?? 0) < PARSER_VERSION;
}

/** Re-fetches every stored regatta that is still recent, and a few stale older ones. */
export async function refreshRecent(
  store: RegattaStore,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<Fetched[]> {
  const zone = club.timezone;
  const all = await store.summaries();
  const recent = all.filter(
    (s) =>
      isRecent(s.date, zone, now) &&
      (isRaceDay(s.dates, zone, now) || now.getUTCMinutes() < OFF_DAY_MINUTES),
  );
  const stale = all.filter((s) => !isRecent(s.date, zone, now) && isStale(s));
  const refreshed: Fetched[] = [];
  for (const { id } of [...recent, ...stale.slice(0, STALE_PER_RUN)]) {
    try {
      const marker = await fetchChangeMarker(id, fetchImpl);
      const fetched = await fetchAndStore(id, store, fetchImpl, now, marker);
      logMarker(fetched);
      refreshed.push(fetched);
    } catch (err) {
      // One failing regatta shouldn't stop the others. The stored copy stays.
      console.error(`Refreshing ${id} failed:`, err);
    }
  }
  return refreshed;
}

/**
 * Looks up the weather for regattas racing today or tomorrow, so parents' page views find it
 * cached instead of waiting on Open-Meteo. Cached forecasts stay fresh for an hour, so this
 * asks at most once an hour per race day. Returns how many race days it covered.
 */
export async function warmConditions(
  store: RegattaStore,
  now: Date = new Date(),
  fetchImpl?: typeof fetch,
): Promise<number> {
  const today = localDate(now, club.timezone);
  const soon = [today, addDays(today, 1)];
  const racing = (await store.summaries()).filter((s) => s.dates.some((d) => soon.includes(d)));
  if (racing.length === 0) return 0;
  const [records, venues] = await Promise.all([
    Promise.all(racing.map((s) => store.get(s.id))),
    store.getVenues(),
  ]);
  const items = records.flatMap((record) =>
    record
      ? regattaDates(record.regatta)
          .filter((date) => soon.includes(date))
          .map((date) => ({ record, venue: venueForSeries(venues, seriesName(record)), date }))
      : [],
  );
  if (items.length > 0) {
    await conditionsFor(items, store.conditions, {
      timeZone: club.timezone,
      units: club.units,
      today,
      now,
      fetchImpl,
    });
  }
  return items.length;
}

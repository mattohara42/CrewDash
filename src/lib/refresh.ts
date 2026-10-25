import { fetchRegattaResults } from "../crewtimer/fetch.js";
import { PARSER_VERSION, normalizeRegatta } from "../crewtimer/normalize.js";
import { recordResultTimes } from "./speed.js";
import type { RegattaStore, StoredRegatta } from "./store.js";

// CrewTimer's "pending official" flag can stay set forever, so regattas are
// re-fetched from the day before race day until this many days after it.
const REFRESH_DAYS_AFTER = 3;
// Older regattas parsed by an earlier version are re-fetched a few at a time, so one run
// stays well inside the scheduled function's time limit.
const STALE_PER_RUN = 5;

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
  };
  await store.put(record);
  return { record, previous };
}

function dayOffset(date: string, now: Date): number {
  const race = Date.parse(`${date}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - race) / 86_400_000);
}

/** True while a regatta's results may still be changing. */
export function isRecent(date: string, now: Date = new Date()): boolean {
  const offset = dayOffset(date, now);
  return Number.isFinite(offset) && offset >= -1 && offset <= REFRESH_DAYS_AFTER;
}

/** True when the stored copy came from an older parser and needs fetching again. */
export function isStale(record: StoredRegatta): boolean {
  return (record.parserVersion ?? 0) < PARSER_VERSION;
}

/** Re-fetches every stored regatta that is still recent, and a few stale older ones. */
export async function refreshRecent(
  store: RegattaStore,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<Fetched[]> {
  const all = await store.list();
  const recent = all.filter((r) => isRecent(r.regatta.date, now));
  const stale = all.filter((r) => !isRecent(r.regatta.date, now) && isStale(r));
  const refreshed: Fetched[] = [];
  for (const { regatta } of [...recent, ...stale.slice(0, STALE_PER_RUN)]) {
    try {
      refreshed.push(await fetchAndStore(regatta.id, store, fetchImpl, now));
    } catch (err) {
      // One failing regatta shouldn't stop the others. The stored copy stays.
      console.error(`Refreshing ${regatta.id} failed:`, err);
    }
  }
  return refreshed;
}

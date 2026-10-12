import { fetchRegattaResults } from "../crewtimer/fetch.js";
import { normalizeRegatta } from "../crewtimer/normalize.js";
import type { RegattaStore, StoredRegatta } from "./store.js";

// CrewTimer's "pending official" flag can stay set forever, so regattas are
// re-fetched from the day before race day until this many days after it.
const REFRESH_DAYS_AFTER = 3;

export async function fetchAndStore(
  id: string,
  store: RegattaStore,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<StoredRegatta> {
  const regatta = normalizeRegatta(id, await fetchRegattaResults(id, fetchImpl));
  const record = { regatta, fetchedAt: now.toISOString() };
  await store.put(record);
  return record;
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

/** Re-fetches every stored regatta that is still recent. Returns the ids refreshed. */
export async function refreshRecent(
  store: RegattaStore,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<string[]> {
  const recent = (await store.list()).filter((r) => isRecent(r.regatta.date, now));
  const refreshed: string[] = [];
  for (const { regatta } of recent) {
    try {
      await fetchAndStore(regatta.id, store, fetchImpl, now);
      refreshed.push(regatta.id);
    } catch (err) {
      // One failing regatta shouldn't stop the others. The stored copy stays.
      console.error(`Refreshing ${regatta.id} failed:`, err);
    }
  }
  return refreshed;
}

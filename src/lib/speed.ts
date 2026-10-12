import type { Event, Regatta } from "../crewtimer/normalize.js";
import type { StoredRegatta } from "./store.js";
import { startMinutes, zonedInstant } from "./today.js";

// How long CrewTimer takes to post results after an event starts. Recorded by the
// race-day refresh, so times are accurate to its 5-minute interval.

export interface ResultTimes {
  // When any boat in the event first got a result.
  first?: string;
  // When every boat in the event had one.
  all?: string;
}

const hasResult = (e: Event) => e.entries.some((x) => x.status !== "pending");
const allResults = (e: Event) =>
  e.entries.length > 0 && e.entries.every((x) => x.status !== "pending");

/**
 * Adds a timestamp for each event whose first or last result appeared since the previous
 * fetch. Only changes seen happen are recorded, so adding a finished regatta records nothing.
 */
export function recordResultTimes(
  previous: StoredRegatta | null,
  regatta: Regatta,
  now: Date,
): Record<string, ResultTimes> | undefined {
  if (!previous) return undefined;
  const times = { ...previous.resultTimes };
  const before = new Map(previous.regatta.events.map((e) => [e.num, e]));
  for (const event of regatta.events) {
    const old = before.get(event.num);
    const t = { ...times[event.num] };
    if (!t.first && hasResult(event) && (!old || !hasResult(old))) t.first = now.toISOString();
    if (!t.all && allResults(event) && (!old || !allResults(old))) t.all = now.toISOString();
    if (t.first || t.all) times[event.num] = t;
  }
  return Object.keys(times).length > 0 ? times : undefined;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Median minutes from event start to its first and to its last result. */
export function speedSummary(
  record: StoredRegatta,
  timeZone: string,
): { events: number; firstMin: number | null; allMin: number | null } {
  const first: number[] = [];
  const all: number[] = [];
  for (const event of record.regatta.events) {
    const t = record.resultTimes?.[event.num];
    const minutes = startMinutes(event.start);
    if (!t || minutes === null) continue;
    const start = zonedInstant(record.regatta.date, minutes, timeZone).getTime();
    if (t.first) first.push((Date.parse(t.first) - start) / 60_000);
    if (t.all) all.push((Date.parse(t.all) - start) / 60_000);
  }
  const round = (n: number | null) => (n === null ? null : Math.round(n));
  return {
    events: Math.max(first.length, all.length),
    firstMin: round(median(first)),
    allMin: round(median(all)),
  };
}

import { eventDate, type Event, type Regatta } from "../crewtimer/normalize.js";
import { formatInstant, startMinutes } from "./format.js";
import type { StoredRegatta } from "./store.js";
import { zonedInstant } from "./today.js";

// Spots race-day results that should have arrived but haven't, so parents know the wait is
// at the timing desk and not in CrewDash. Shown on the Today card.

// How long an event can run without results before it counts as late. Head races here have
// run up to 41 minutes behind schedule, and results take a while after that. To be tuned
// once the results-speed log (speed.ts) has real numbers.
export const STALE_MINUTES = 45;
// The race-day refresh runs every 5 minutes, so a copy older than this means it's failing.
const FETCH_LATE_MINUTES = 20;

const MINUTE = 60_000;

/** How many boats have a result, to spot when CrewTimer posts something new. */
export function resultCount(regatta: Regatta): number {
  return regatta.events.reduce(
    (n, e) => n + e.entries.filter((x) => x.status !== "pending").length,
    0,
  );
}

/** When results last changed: now if the count moved since the previous copy, else as before. */
export function resultsChangedAt(
  previous: StoredRegatta | null,
  regatta: Regatta,
  now: Date,
): string | undefined {
  if (!previous) return undefined;
  if (resultCount(previous.regatta) !== resultCount(regatta)) return now.toISOString();
  return previous.resultsChangedAt;
}

// The event's real start when any boat has one, since regattas run late. Otherwise its
// scheduled start.
function startOf(
  regatta: Regatta,
  event: Event,
  timeZone: string,
): { at: Date; actual: boolean } | null {
  const actual = event.entries
    .map((e) => e.startedAt)
    .filter((m): m is number => typeof m === "number");
  const minutes = actual.length > 0 ? Math.max(...actual) : startMinutes(event.start);
  if (minutes === null) return null;
  return {
    at: zonedInstant(eventDate(regatta, event), minutes, timeZone),
    actual: actual.length > 0,
  };
}

// The latest moment results are known to have changed. Copies stored before
// resultsChangedAt existed fall back to the results-speed log.
function lastChange(record: StoredRegatta): number | null {
  const times = [
    record.resultsChangedAt,
    ...Object.values(record.resultTimes ?? {}).flatMap((t) => [t.first, t.all]),
  ]
    .filter((t): t is string => !!t)
    .map(Date.parse);
  return times.length > 0 ? Math.max(...times) : null;
}

/**
 * A line saying results are late on this race day, or null when they aren't. Late means an
 * event started at least STALE_MINUTES ago still has boats without results, and CrewTimer
 * hasn't posted anything new in that long either. That covers a regatta that never posts
 * and one that goes quiet partway through.
 */
export function staleNote(
  record: StoredRegatta,
  date: string,
  timeZone: string,
  now: Date = new Date(),
): string | null {
  const { regatta } = record;
  const clock = (at: Date | number) =>
    formatInstant(new Date(at), timeZone, { hour: "numeric", minute: "2-digit" });

  const today = regatta.events
    .filter((e) => eventDate(regatta, e) === date)
    .map((event) => ({ event, start: startOf(regatta, event, timeZone) }));
  // Nothing to be late until racing has begun.
  if (!today.some((t) => t.start && t.start.at <= now)) return null;

  const fetched = Date.parse(record.fetchedAt);
  if (Number.isFinite(fetched) && now.getTime() - fetched > FETCH_LATE_MINUTES * MINUTE) {
    return `CrewDash last checked CrewTimer at ${clock(fetched)}, so results here may be behind.`;
  }

  const cutoff = now.getTime() - STALE_MINUTES * MINUTE;
  const changed = lastChange(record);
  if (changed !== null && changed > cutoff) return null;

  const waiting = today
    .filter(
      (t): t is { event: Event; start: { at: Date; actual: boolean } } =>
        !!t.start &&
        t.start.at.getTime() <= cutoff &&
        !t.event.official &&
        t.event.entries.some((x) => x.status === "pending"),
    )
    .sort((a, b) => a.start.at.getTime() - b.start.at.getTime());
  const first = waiting[0];
  if (!first) return null;

  // A copy added mid-regatta has results but no record of when they changed.
  const since =
    changed !== null
      ? `No new results from CrewTimer since ${clock(changed)}.`
      : resultCount(regatta) === 0
        ? "CrewTimer hasn't posted any results yet."
        : "No new results from CrewTimer lately.";
  const others = waiting.length - 1;
  const more =
    others > 0 ? `, as ${others === 1 ? "is 1 other event" : `are ${others} other events`}` : "";
  return (
    `${since} ${first.event.name} ${first.start.actual ? "started" : "was due"} at ` +
    `${clock(first.start.at)} and is still waiting for results` +
    `${more}. The timing desk may be running behind.`
  );
}

import type { ClubIdentity } from "../club.js";
import { eventDate, type Event, type Regatta } from "../crewtimer/normalize.js";
import { clubEvents, type ClubBoat } from "./club-view.js";
import { formatClock, formatTime, ordinal, statusLabel } from "./format.js";
import { eventKey, type Settings } from "./settings.js";
import { zonedInstant } from "./today.js";

// Which results are worth a notification. In a head race an early finisher's
// place is provisional until every boat is in, so an event only notifies once
// it's complete, and again only if the club's results change afterwards.
// Notifications name the event, bow, place and time, never a rower, because
// they show on lock screens. Club boats also notify when they start.

export interface ResultNotice {
  regattaId: string;
  eventKey: string;
  kind: "start" | "result" | "update";
  title: string;
  body: string;
  url: string;
}

function isComplete(event: Event): boolean {
  return event.entries.length > 0 && event.entries.every((e) => e.status !== "pending");
}

function describe(boat: ClubBoat, fieldSize: number): string {
  const { entry } = boat;
  const time = entry.adjustedTimeMs !== null ? `, ${formatTime(entry.adjustedTimeMs)}` : "";
  const result =
    entry.place !== null
      ? `${ordinal(entry.place)} of ${fieldSize}${time}`
      : `${statusLabel(entry).toLowerCase()}${time}`;
  return `bow ${entry.bow} ${result}`;
}

function clubSummaries(regatta: Regatta, club: ClubIdentity): Map<string, string> {
  const summaries = new Map<string, string>();
  for (const { event, fieldSize, boats } of clubEvents(regatta, club)) {
    if (!isComplete(event)) continue;
    summaries.set(event.num, boats.map((b) => describe(b, fieldSize)).join("; "));
  }
  return summaries;
}

/**
 * Notices for club events that finished, or whose club results changed,
 * between two fetches of a regatta. A first fetch (no `before`) never notifies,
 * so adding a finished regatta doesn't send a burst of old results.
 */
export function resultNotices(
  before: Regatta | null,
  after: Regatta,
  club: ClubIdentity,
  settings: Settings,
): ResultNotice[] {
  if (!before) return [];
  const previous = clubSummaries(before, club);
  const notices: ResultNotice[] = [];
  for (const [num, summary] of clubSummaries(after, club)) {
    const old = previous.get(num);
    if (old === summary) continue;
    const event = after.events.find((e) => e.num === num)!;
    notices.push({
      regattaId: after.id,
      eventKey: eventKey(event.name, settings),
      kind: old === undefined ? "result" : "update",
      title: after.title,
      body: `${old === undefined ? "" : "Updated: "}${event.name}: ${summary}`,
      url: `/regatta/${after.id}`,
    });
  }
  return notices;
}

// A start found later than this (a missed refresh, or Refresh now after racing) is old
// news, so it isn't sent.
const START_ALERT_WITHIN_MS = 30 * 60_000;

/**
 * One notice per club event whose club boats started between two fetches, naming the
 * bows and start times. A first fetch never notifies, the same as results.
 */
export function startNotices(
  before: Regatta | null,
  after: Regatta,
  club: ClubIdentity,
  settings: Settings,
  timeZone: string,
  now: Date,
): ResultNotice[] {
  if (!before) return [];
  const notices: ResultNotice[] = [];
  for (const { event, boats } of clubEvents(after, club)) {
    const earlier = before.events.find((e) => e.num === event.num);
    const started = boats
      .map((b) => b.entry)
      .filter((entry) => {
        if (entry.startedAt == null) return false;
        const was = earlier?.entries.find((e) => e.bow === entry.bow);
        // Undefined means the earlier copy was stored before start times were kept.
        if (was && was.startedAt !== null) return false;
        const at = zonedInstant(eventDate(after, event), Math.floor(entry.startedAt), timeZone);
        const age = now.getTime() - at.getTime();
        return age >= -START_ALERT_WITHIN_MS && age <= START_ALERT_WITHIN_MS;
      });
    if (started.length === 0) continue;
    const bows = started.map((e) => `bow ${e.bow} at ${formatClock(e.startedAt!)}`).join(", ");
    notices.push({
      regattaId: after.id,
      eventKey: eventKey(event.name, settings),
      kind: "start",
      title: after.title,
      body: `Started: ${event.name}, ${bows}`,
      url: `/regatta/${after.id}`,
    });
  }
  return notices;
}

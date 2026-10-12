import type { ClubConfig } from "../club.js";
import type { Event, Regatta } from "../crewtimer/normalize.js";
import { clubEvents, type ClubBoat } from "./club-view.js";
import { formatTime, ordinal, statusLabel } from "./format.js";
import { eventKey, type Settings } from "./settings.js";

// Which results are worth a notification. In a head race an early finisher's
// place is provisional until every boat is in, so an event only notifies once
// it's complete, and again only if the club's results change afterwards.
// Notifications name the event, bow, place and time, never a rower, because
// they show on lock screens.

export interface ResultNotice {
  regattaId: string;
  eventKey: string;
  kind: "result" | "update";
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

function clubSummaries(regatta: Regatta, club: ClubConfig): Map<string, string> {
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
  club: ClubConfig,
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

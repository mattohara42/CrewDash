import type { ClubIdentity } from "../club.js";
import { addDays, eventDate, regattaDates } from "../crewtimer/normalize.js";
import { clubEvents } from "./club-view.js";
import type { StoredRegatta } from "./store.js";
import { startMinutes, zonedInstant } from "./today.js";
import { weatherPlace, type Venue } from "./venues.js";

// "Add to calendar": an .ics file with the club's events at a regatta. It's a download,
// so it works behind the club password. Without start times it's one all-day event.

function escape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

export function regattaCalendar(
  record: StoredRegatta,
  club: ClubIdentity & { timezone: string },
  venue: Venue | null,
  now: Date = new Date(),
): string {
  const { regatta } = record;
  const place = venue ? weatherPlace(venue) : null;
  const where = [
    ...(venue ? [`LOCATION:${escape(venue.name)}`] : []),
    ...(place ? [`GEO:${place.lat};${place.lon}`] : []),
  ];
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CrewDash//EN", "CALSCALE:GREGORIAN"];
  const event = (uid: string, summary: string, when: string[], description: string) =>
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@crewdash`,
      `DTSTAMP:${stamp(now)}`,
      ...when,
      `SUMMARY:${escape(summary)}`,
      `DESCRIPTION:${escape(description)}`,
      ...where,
      "END:VEVENT",
    );

  const timed = clubEvents(regatta, club).flatMap(({ event: e, boats }) => {
    const minutes = startMinutes(e.start);
    if (minutes === null) return [];
    const start = zonedInstant(eventDate(regatta, e), minutes, club.timezone);
    return [{ e, boats, start }];
  });

  if (timed.length === 0) {
    // DTEND is exclusive: the day after the last race day.
    const next = addDays(regattaDates(regatta).at(-1)!, 1);
    event(
      regatta.id,
      regatta.title,
      [
        `DTSTART;VALUE=DATE:${regatta.date.replace(/-/g, "")}`,
        `DTEND;VALUE=DATE:${next.replace(/-/g, "")}`,
      ],
      `${club.name} at ${regatta.title}`,
    );
  } else {
    for (const { e, boats, start } of timed) {
      const bows = boats.map((b) => b.entry.bow).join(", ");
      event(
        `${regatta.id}-${e.num}`,
        `${e.name} (${boats.length === 1 ? "bow" : "bows"} ${bows})`,
        // An hour is a guess: the event start, not each boat's.
        [`DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + 3_600_000))}`],
        `${club.name} at ${regatta.title}. Times are the event's scheduled start.`,
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

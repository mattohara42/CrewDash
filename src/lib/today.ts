import type { ClubIdentity } from "../club.js";
import { addDays, eventDate, regattaDates } from "../crewtimer/normalize.js";
import { clubEvents } from "./club-view.js";
import { formatStart, ordinal, statusLabel } from "./format.js";
import { eventKey, type Settings } from "./settings.js";
import type { StoredRegatta } from "./store.js";

// The race-day view: today's and tomorrow's regattas, the club's events in start order.

export interface TodayEvent {
  key: string;
  name: string;
  start: string;
  // When the event starts, if CrewTimer gave a start time.
  startAt: string | null;
  // One line per club boat: "Bow 12 · 3rd of 9" or "Bow 12 · No result yet".
  boats: string[];
  done: boolean;
}

// One race day of a regatta. A two-day regatta shows as two cards on its first day.
export interface TodayRegatta {
  record: StoredRegatta;
  // The race day this card covers.
  date: string;
  when: "Today" | "Tomorrow";
  events: TodayEvent[];
}

/** "2026-10-12" for the given instant in the given time zone. */
export function localDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** Minutes after midnight for "9:30:00 AM", "9:30 AM" or "13:05", or null. */
export function startMinutes(start: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?$/i.exec(start.trim());
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const ampm = m[3]?.toUpperCase();
  if (ampm) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (ampm === "PM" ? 12 : 0);
  }
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** The instant a local wall-clock time on a date happens in a time zone. */
export function zonedInstant(date: string, minutes: number, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(guess)
      .map((p) => [p.type, Number(p.value)]),
  );
  const shown = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!);
  return new Date(guess - (shown - guess));
}

export function todayRegattas(
  records: StoredRegatta[],
  club: ClubIdentity,
  settings: Settings,
  timeZone: string,
  now: Date = new Date(),
): TodayRegatta[] {
  const today = localDate(now, timeZone);
  const tomorrow = addDays(today, 1);
  return records
    .flatMap((record) =>
      regattaDates(record.regatta)
        .filter((date) => date === today || date === tomorrow)
        .map((date) => ({ record, date })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ record, date }) => {
      const events = clubEvents(record.regatta, club)
        .filter(({ event }) => eventDate(record.regatta, event) === date)
        .map(({ event, fieldSize, boats }) => {
          const minutes = startMinutes(event.start);
          return {
            order: minutes ?? Number.MAX_SAFE_INTEGER,
            num: Number(event.num) || 0,
            key: eventKey(event.name, settings),
            name: event.name,
            start: event.start ? formatStart(event.start) : "",
            startAt: minutes === null ? null : zonedInstant(date, minutes, timeZone).toISOString(),
            boats: boats.map(({ entry }) => {
              const result =
                entry.place !== null
                  ? `${ordinal(entry.place)} of ${fieldSize}`
                  : statusLabel(entry);
              return `Bow ${entry.bow} · ${result}`;
            }),
            done: boats.every(({ entry }) => entry.status !== "pending"),
          };
        })
        .sort((a, b) => a.order - b.order || a.num - b.num)
        .map(({ key, name, start, startAt, boats, done }) => ({
          key,
          name,
          start,
          startAt,
          boats,
          done,
        }));
      return {
        record,
        date,
        when: date === today ? ("Today" as const) : ("Tomorrow" as const),
        events,
      };
    });
}

import type { Entry } from "../crewtimer/normalize.js";
import { club } from "./config.js";

/** 1_168_427 -> "19:28.4", 3_750_049 -> "1:02:30.0" */
export function formatTime(ms: number): string {
  const tenths = Math.round(ms / 100);
  const seconds = Math.floor(tenths / 10) % 60;
  const minutes = Math.floor(tenths / 600) % 60;
  const hours = Math.floor(tenths / 36_000);
  const ss = `${String(seconds).padStart(2, "0")}.${tenths % 10}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}` : `${minutes}:${ss}`;
}

export function formatMargin(ms: number): string {
  return ms === 0 ? "winner" : `+${formatTime(ms)}`;
}

/** A gap between crews: "1.2 s" under a minute, "1:02.3" otherwise. */
export function formatGap(ms: number): string {
  return ms < 60_000 ? `${(Math.round(ms / 100) / 10).toFixed(1)} s` : formatTime(ms);
}

/** Pace per 500 m over a course, from the time on the water. */
export function pacePer500(timeMs: number, courseLengthM: number): string {
  return formatTime((timeMs * 500) / courseLengthM);
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

const STATUS_LABELS: Record<Entry["status"], string> = {
  finished: "Finished",
  exhibition: "Exhibition",
  dns: "Did not start",
  dnf: "Did not finish",
  dq: "Disqualified",
  scratch: "Scratched",
  pending: "No result yet",
  unknown: "Result unclear",
};

export function statusLabel(entry: Entry): string {
  return entry.status === "unknown" && entry.adjustedTimeText
    ? entry.adjustedTimeText
    : STATUS_LABELS[entry.status];
}

// Dates, times and numbers are written the club's way (the "locale" club setting). The wording
// stays English. Some ICU versions put a narrow no-break space before AM and PM, which
// is swapped for a plain one so the text is the same everywhere.
function plain(text: string): string {
  return text.replace(/\u202f/g, " ");
}

/** "2026-10-11" -> "Sun, Oct 11, 2026" (en-US) or "Sun, 11 Oct 2026" (en-GB) */
export function formatDate(date: string, locale: string = club.locale): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** One date, or "Sat, Oct 24, 2026 to Sun, Oct 25, 2026" for a multi-day regatta. */
export function formatDates(dates: string[], locale: string = club.locale): string {
  return dates.length > 1
    ? `${formatDate(dates[0]!, locale)} to ${formatDate(dates.at(-1)!, locale)}`
    : formatDate(dates[0] ?? "", locale);
}

/** "2026-10-11" -> "Sun" */
export function formatWeekday(date: string, locale: string = club.locale): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" });
}

/** Minutes after midnight -> "9:12 AM" (en-US) or "09:12" (en-GB) */
export function formatClock(minutes: number, locale: string = club.locale): string {
  const at = new Date(Date.UTC(2000, 0, 1, 0, Math.floor(minutes)));
  return plain(
    at.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
  );
}

/** An instant as a local date and time, such as "Oct 11, 9:12 AM", in the club's way. */
export function formatInstant(
  at: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  locale: string = club.locale,
): string {
  return plain(at.toLocaleString(locale, { ...options, timeZone }));
}

/** 1234.5 -> "1,234.5" (en-US) or "1.234,5" (de-DE) */
export function formatNumber(n: number, locale: string = club.locale): string {
  return n.toLocaleString(locale);
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

/**
 * A start time from CrewTimer in the club's way: "10:40:00 AM" -> "10:40 AM" (en-US) or
 * "10:40" (en-GB). Times with seconds other than :00, and other text, pass through.
 */
export function formatStart(start: string, locale: string = club.locale): string {
  const minutes = startMinutes(start);
  if (minutes === null || /:\d{2}:(?!00\b)\d{2}/.test(start)) return start;
  return formatClock(minutes, locale);
}

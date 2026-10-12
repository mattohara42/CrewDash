import type { Entry } from "../crewtimer/normalize.js";

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

/** "2026-10-11" -> "Sun, Oct 11, 2026" */
export function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "10:40:00 AM" -> "10:40 AM". Other text passes through. */
export function formatStart(start: string): string {
  return start.replace(/^(\d{1,2}:\d{2}):00(\s*[AP]M)$/i, "$1$2");
}

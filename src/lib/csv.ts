import type { ClubIdentity } from "../club.js";
import { clubEvents } from "./club-view.js";
import { formatTime, statusLabel } from "./format.js";
import type { StoredRegatta } from "./store.js";

// The club's results as a spreadsheet, for coaches. Includes stroke names, so it's coach-only.

const HEADERS = [
  "Date",
  "Regatta",
  "Event",
  "Bow",
  "Crew",
  "Stroke",
  "Place",
  "Crews placed",
  "Result",
  "Adjusted time",
  "Raw time",
  "Behind winner",
  "Penalties",
];

function cell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  // Quote anything with a comma, quote or newline. A leading = + - @ would run as a
  // formula in a spreadsheet, so those get a leading apostrophe.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function resultsCsv(records: StoredRegatta[], club: ClubIdentity): string {
  const rows = [HEADERS];
  const sorted = [...records].sort((a, b) => a.regatta.date.localeCompare(b.regatta.date));
  for (const { regatta } of sorted) {
    for (const { event, fieldSize, boats } of clubEvents(regatta, club)) {
      for (const { entry, marginMs } of boats) {
        rows.push([
          regatta.date,
          regatta.title,
          event.name,
          entry.bow,
          entry.crew,
          entry.stroke,
          entry.place === null ? "" : String(entry.place),
          String(fieldSize),
          statusLabel(entry),
          entry.adjustedTimeMs === null ? "" : formatTime(entry.adjustedTimeMs),
          entry.rawTimeMs === null ? "" : formatTime(entry.rawTimeMs),
          marginMs === null ? "" : formatTime(marginMs),
          entry.penalties
            .map((p) => (p.seconds !== null ? `${p.code} +${p.seconds}s` : p.code))
            .join("; "),
        ]);
      }
    }
  }
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

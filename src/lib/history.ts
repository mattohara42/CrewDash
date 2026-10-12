import { normalizeName, type ClubConfig } from "../club.js";
import type { Regatta } from "../crewtimer/normalize.js";
import { clubEvents, type ClubBoat } from "./club-view.js";
import { eventKey, type Settings } from "./settings.js";
import type { StoredRegatta } from "./store.js";

// Year over year at the same regatta, and one event followed through a season.

/** "2026 Head of the Genesee - Sunday" -> "Head of the Genesee - Sunday" */
export function suggestSeries(title: string): string {
  return title
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-:–]+|[\s\-:–]+$/g, "")
    .trim();
}

export function seriesName(record: StoredRegatta): string {
  return record.series?.trim() || suggestSeries(record.regatta.title);
}

/** Case and spacing don't matter, so "SUNDAY" and "Sunday" land together. */
export function seriesKey(name: string): string {
  return normalizeName(name);
}

export function regattaYear(regatta: Regatta): string {
  return regatta.date.slice(0, 4);
}

export interface HistoryRow {
  regatta: Regatta;
  eventName: string;
  fieldSize: number;
  boats: ClubBoat[];
}

export interface HistoryGroup {
  key: string;
  // The most recent name the event was raced under.
  name: string;
  rows: HistoryRow[];
}

function newestFirst(a: StoredRegatta, b: StoredRegatta): number {
  return b.regatta.date.localeCompare(a.regatta.date);
}

/** Groups the club's boats by event across the given regattas, newest regatta first. */
export function historyByEvent(
  records: StoredRegatta[],
  club: ClubConfig,
  settings: Settings,
): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>();
  for (const { regatta } of [...records].sort(newestFirst)) {
    for (const { event, fieldSize, boats } of clubEvents(regatta, club)) {
      const key = eventKey(event.name, settings);
      const group = groups.get(key) ?? { key, name: event.name, rows: [] };
      group.rows.push({ regatta, eventName: event.name, fieldSize, boats });
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function regattasInSeries(records: StoredRegatta[], key: string): StoredRegatta[] {
  return records.filter((r) => seriesKey(seriesName(r)) === key).sort(newestFirst);
}

export function regattasInYear(records: StoredRegatta[], year: string): StoredRegatta[] {
  return records.filter((r) => regattaYear(r.regatta) === year).sort(newestFirst);
}

/** Every event name raced in these regattas, for the admin's merge form. */
export function eventNames(records: StoredRegatta[]): string[] {
  const names = new Map<string, string>();
  for (const { regatta } of records) {
    for (const event of regatta.events) names.set(normalizeName(event.name), event.name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

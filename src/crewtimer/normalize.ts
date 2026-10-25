import { parsePenaltyCode, parseTime, type Penalty } from "./parse.js";
import type { RawEntry, RawEvent, RawRegattaResults } from "./raw.js";

export type EntryStatus =
  | "finished"
  | "exhibition"
  | "dns"
  | "dnf"
  | "dq"
  | "scratch"
  // No time yet: the race hasn't finished or results aren't in.
  | "pending"
  // AdjTime held something we don't recognize. Shown as-is, never guessed at.
  | "unknown";

export interface Entry {
  bow: string;
  crew: string;
  crewAbbrev: string;
  stroke: string;
  place: number | null;
  status: EntryStatus;
  rawTimeMs: number | null;
  adjustedTimeMs: number | null;
  // The original AdjTime text, kept for display when status is "unknown".
  adjustedTimeText: string;
  penalties: Penalty[];
  averageAge: number | null;
  handicapSeconds: number | null;
  // Minutes after midnight, on the event's day, that the boat started. Null until it
  // has, and missing on records stored before start times were kept.
  startedAt?: number | null;
}

export interface Event {
  num: string;
  name: string;
  raceType: string;
  start: string;
  // Days after the regatta's first day. Missing for one-day regattas and on records
  // stored before multi-day support. Use eventDate() rather than reading it directly.
  day?: number;
  official: boolean;
  entries: Entry[];
}

export interface Regatta {
  id: string;
  title: string;
  // The first day. Events on later days carry a day offset.
  date: string;
  raceType: string;
  resultsPendingOfficial: boolean;
  events: Event[];
}

const STATUS_WORDS: Record<string, EntryStatus> = {
  dns: "dns",
  dnf: "dnf",
  dq: "dq",
  scratch: "scratch",
};

function listOf<T>(value: T[] | Record<string, T> | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function parsePlace(place: number | string): number | null {
  if (typeof place === "number") return place;
  return /^\d+$/.test(place.trim()) ? Number(place) : null;
}

/** "08:20:29.740" -> minutes after midnight (500.49...), or null. */
function parseClockTime(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(text.trim());
  if (!m) return null;
  const [hours, minutes, seconds] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return hours < 24 && minutes < 60 && seconds < 60 ? hours * 60 + minutes + seconds / 60 : null;
}

export function normalizeEntry(raw: RawEntry): Entry {
  const info = parsePenaltyCode(raw.PenaltyCode);
  const adjText = (raw.AdjTime ?? "").trim();
  const exhibitionTime = /^exh\s+(.+)$/i.exec(adjText);

  let adjustedTimeMs = parseTime(exhibitionTime ? exhibitionTime[1]! : adjText);
  let status: EntryStatus;
  if (exhibitionTime || info.exhibition) {
    status = "exhibition";
  } else if (adjustedTimeMs !== null) {
    status = "finished";
  } else if (adjText === "") {
    status = "pending";
  } else {
    status = STATUS_WORDS[adjText.toLowerCase()] ?? "unknown";
    adjustedTimeMs = null;
  }

  return {
    bow: String(raw.Bow),
    crew: raw.Crew,
    crewAbbrev: raw.CrewAbbrev ?? "",
    stroke: raw.Stroke ?? "",
    place: status === "finished" ? parsePlace(raw.Place) : null,
    status,
    rawTimeMs: parseTime(raw.RawTime ?? ""),
    adjustedTimeMs,
    adjustedTimeText: adjText,
    penalties: info.penalties,
    averageAge: info.averageAge,
    handicapSeconds: info.handicapSeconds,
    startedAt: parseClockTime(raw.G_Start_time_raw ?? ""),
  };
}

/** "2026-10-24" plus a number of days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// Stored regattas keep the parser's output, not CrewTimer's raw JSON. Bump this whenever
// normalizeRegatta's output changes, and the scheduled refresh re-fetches every older copy.
export const PARSER_VERSION = 1;

/** The date an event races on. */
export function eventDate(regatta: Pick<Regatta, "date">, event: Pick<Event, "day">): string {
  return event.day ? addDays(regatta.date, event.day) : regatta.date;
}

/** Every date the regatta races on, in order. */
export function regattaDates(regatta: Pick<Regatta, "date" | "events">): string[] {
  const dates = new Set([regatta.date, ...regatta.events.map((e) => eventDate(regatta, e))]);
  return [...dates].sort();
}

function normalizeEvent(raw: RawEvent, regattaRaceType: string, days: string[]): Event {
  const num = String(raw.EventNum);
  // "23 Mens HS Novice 4+" -> "Mens HS Novice 4+"
  const event = raw.Event.replace(/\s+/g, " ").trim();
  const name = event.startsWith(`${num} `) ? event.slice(num.length).trim() : event;
  const day = raw.Day ? days.indexOf(raw.Day) : -1;
  return {
    num,
    name,
    raceType: raw.RaceType || regattaRaceType,
    start: raw.Start ?? "",
    ...(day > 0 && { day }),
    official: raw.Official === true,
    entries: listOf(raw.entries).map(normalizeEntry),
  };
}

export function normalizeRegatta(id: string, raw: RawRegattaResults): Regatta {
  if (!raw?.regattaInfo || !raw.results) {
    throw new Error(`Regatta ${id} has no results data`);
  }
  const info = raw.regattaInfo;
  const raceType = info.RaceType ?? "";
  const days = listOf(info.DayList);
  return {
    id,
    title: info.Title,
    date: info.Date,
    raceType,
    resultsPendingOfficial: info.ResultsPendOfficial === true,
    events: listOf(raw.results).map((event) => normalizeEvent(event, raceType, days)),
  };
}

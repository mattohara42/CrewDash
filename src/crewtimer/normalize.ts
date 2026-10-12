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
}

export interface Event {
  num: string;
  name: string;
  raceType: string;
  start: string;
  official: boolean;
  entries: Entry[];
}

export interface Regatta {
  id: string;
  title: string;
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
  };
}

function normalizeEvent(raw: RawEvent, regattaRaceType: string): Event {
  const num = String(raw.EventNum);
  // "23 Mens HS Novice 4+" -> "Mens HS Novice 4+"
  const event = raw.Event.replace(/\s+/g, " ").trim();
  const name = event.startsWith(`${num} `) ? event.slice(num.length).trim() : event;
  return {
    num,
    name,
    raceType: raw.RaceType || regattaRaceType,
    start: raw.Start ?? "",
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
  return {
    id,
    title: info.Title,
    date: info.Date,
    raceType,
    resultsPendingOfficial: info.ResultsPendOfficial === true,
    events: listOf(raw.results).map((event) => normalizeEvent(event, raceType)),
  };
}

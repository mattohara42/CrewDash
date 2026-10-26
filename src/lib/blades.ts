import { matchClub, normalizeName, type ClubConfig } from "../club.js";
import type { Entry, Event } from "../crewtimer/normalize.js";
import { PATTERNS, type BladeDesign, type BladePattern } from "./blade.js";
import type { StoredRegatta } from "./store.js";

// Other clubs' blades, entered by the admin as a pattern and two colors (see blade.ts).
// OarSpotter declined to let us use its images, so CrewDash draws its own.

export interface ClubBlade {
  // The club's name as it appears in results, without a boat letter or "- EXH".
  name: string;
  design: BladeDesign;
}

export interface BladeData {
  clubs: ClubBlade[];
}

export const EMPTY_BLADES: BladeData = { clubs: [] };

const HEX = /^#[0-9a-f]{6}$/i;

export function parseDesign(value: unknown): BladeDesign | null {
  const v = value as Partial<BladeDesign> | null;
  if (!v || !PATTERNS.includes(v.pattern as BladePattern)) return null;
  if (typeof v.base !== "string" || !HEX.test(v.base)) return null;
  if (typeof v.accent !== "string" || !HEX.test(v.accent)) return null;
  return { pattern: v.pattern as BladePattern, base: v.base, accent: v.accent };
}

export function parseBladeData(value: unknown): BladeData {
  const clubs = (value as { clubs?: unknown } | null)?.clubs;
  if (!Array.isArray(clubs)) return EMPTY_BLADES;
  return {
    clubs: clubs.flatMap((c) => {
      const design = parseDesign((c as ClubBlade | null)?.design);
      const name = (c as ClubBlade | null)?.name;
      return design && typeof name === "string" && name.trim() ? [{ name, design }] : [];
    }),
  };
}

/** "Hillside Boat Club (B)" and "Hillside Boat Club - EXH" -> "Hillside Boat Club". */
export function crewClub(crew: string): string {
  return crew
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*exh(ibition)?$/i, "")
    .replace(/\s*\([a-z]\)$/i, "");
}

function clubKey(name: string): string {
  return normalizeName(crewClub(name));
}

/** Adds or replaces a club's blade. */
export function setClubBlade(data: BladeData, name: string, design: BladeDesign): BladeData {
  const clean = crewClub(name);
  const others = data.clubs.filter((c) => clubKey(c.name) !== clubKey(clean));
  return { clubs: [...others, { name: clean, design }] };
}

export function removeClubBlade(data: BladeData, name: string): BladeData {
  return { clubs: data.clubs.filter((c) => clubKey(c.name) !== clubKey(name)) };
}

/** This club's own blade, from the club settings. */
export function ownBlade(club: Pick<ClubConfig, "colors">): BladeDesign {
  return { pattern: "tips", base: club.colors.blade.base, accent: club.colors.blade.tip };
}

/** The blade for a crew name: the club's own, an admin-entered one, or null. */
export function bladeFor(crew: string, data: BladeData, club: ClubConfig): BladeDesign | null {
  if (matchClub(crew, club) === "match") return ownBlade(club);
  const key = clubKey(crew);
  return data.clubs.find((c) => clubKey(c.name) === key)?.design ?? null;
}

/** Other clubs in the stored results, most entries first, for the blade editor. */
export function otherClubs(
  records: StoredRegatta[],
  club: ClubConfig,
): { name: string; entries: number }[] {
  const counts = new Map<string, { name: string; entries: number }>();
  for (const { regatta } of records) {
    for (const event of regatta.events) {
      for (const { crew } of event.entries) {
        if (matchClub(crew, club) === "match" || !crew.trim()) continue;
        const key = clubKey(crew);
        const found = counts.get(key) ?? { name: crewClub(crew), entries: 0 };
        found.entries++;
        counts.set(key, found);
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name));
}

// Placed boats first, then exhibition boats by time, then boats still racing by bow,
// then everyone who didn't finish.
function rank(entry: Entry): number {
  if (entry.place !== null) return 0;
  if (entry.status === "exhibition") return 1;
  if (entry.status === "pending") return 2;
  return 3;
}

/** Every entry in an event in results order, for the "whole field" list. */
export function fullField(event: Pick<Event, "entries">): Entry[] {
  return [...event.entries].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.place ?? 0) - (b.place ?? 0) ||
      (a.adjustedTimeMs ?? 0) - (b.adjustedTimeMs ?? 0) ||
      (Number(a.bow) || 0) - (Number(b.bow) || 0),
  );
}

import { matchClub, normalizeName, type ClubConfig } from "../club.js";
import type { Entry, Event } from "../crewtimer/normalize.js";
import { parseDesign, type BladeDesign } from "./blade.js";
import type { StoredRegatta } from "./store.js";

// Other clubs' blades, entered by the admin as a base color and layered shapes (see blade.ts).
// OarSpotter declined to let us use its images, so CrewDash draws its own.

export interface ClubBlade {
  // The club's name as it appears in results, without a boat letter or "- EXH".
  name: string;
  // Other names the club races under, merged in by the admin, such as "Hillside RC" for
  // "Hillside Rowing Club, Inc.". Left out when there are none.
  aliases?: string[];
  // Null when names are merged but the club has no blade yet.
  design: BladeDesign | null;
}

export interface BladeData {
  clubs: ClubBlade[];
}

export const EMPTY_BLADES: BladeData = { clubs: [] };

export const MAX_CLUB_ALIASES = 20;

const validName = (n: unknown): n is string => typeof n === "string" && n.trim() !== "";

export function parseBladeData(value: unknown): BladeData {
  const clubs = (value as { clubs?: unknown } | null)?.clubs;
  if (!Array.isArray(clubs)) return EMPTY_BLADES;
  return {
    clubs: clubs.flatMap((c) => {
      const v = c as Partial<ClubBlade> | null;
      const design = parseDesign(v?.design);
      const aliases = Array.isArray(v?.aliases) ? v.aliases.filter(validName) : [];
      if (!validName(v?.name) || (!design && aliases.length === 0)) return [];
      return [{ name: v.name, ...(aliases.length > 0 && { aliases }), design }];
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

/** True when two crew names are the same club, ignoring boat letters, "- EXH" and spacing. */
export function sameClub(a: string, b: string): boolean {
  return clubKey(a) === clubKey(b);
}

/** The saved club a crew name belongs to, by its name or a merged one. */
export function findClub(data: BladeData, crew: string): ClubBlade | undefined {
  const key = clubKey(crew);
  return data.clubs.find((c) => [c.name, ...(c.aliases ?? [])].some((n) => clubKey(n) === key));
}

function withEntry(data: BladeData, old: ClubBlade | undefined, next: ClubBlade | null) {
  const others = data.clubs.filter((c) => c !== old);
  return { clubs: next ? [...others, next] : others };
}

/** Adds or replaces a club's blade. */
export function setClubBlade(data: BladeData, name: string, design: BladeDesign): BladeData {
  const found = findClub(data, name);
  return withEntry(data, found, { ...(found ?? { name: crewClub(name) }), design });
}

/** Removes a club's blade. Names merged into it stay merged. */
export function removeClubBlade(data: BladeData, name: string): BladeData {
  const found = findClub(data, name);
  if (!found) return data;
  return withEntry(data, found, found.aliases ? { ...found, design: null } : null);
}

/**
 * Counts `from` as the same club as `into` from now on. Names already merged into
 * `from` move with it, and `into` keeps its blade, or takes `from`'s if it has none.
 * Throws with a message for the admin when the merge makes no sense.
 */
export function mergeClubs(data: BladeData, from: string, into: string): BladeData {
  if (sameClub(from, into)) throw new Error("Pick a different club to merge with.");
  const source = findClub(data, from);
  const target = findClub(data, into);
  if (source && source === target) throw new Error("Those are already the same club.");
  const name = target?.name ?? crewClub(into);
  const aliases: string[] = [];
  for (const n of [
    ...(target?.aliases ?? []),
    source?.name ?? crewClub(from),
    ...(source?.aliases ?? []),
  ]) {
    if (!sameClub(n, name) && !aliases.some((a) => sameClub(a, n))) aliases.push(n);
  }
  if (aliases.length > MAX_CLUB_ALIASES) {
    throw new Error(`A club can have at most ${MAX_CLUB_ALIASES} other names.`);
  }
  const merged = { name, aliases, design: target?.design ?? source?.design ?? null };
  return { clubs: [...data.clubs.filter((c) => c !== source && c !== target), merged] };
}

/** Undoes a merge, so the name lists as its own club again. */
export function unmergeClub(data: BladeData, alias: string): BladeData {
  const found = findClub(data, alias);
  if (!found?.aliases || sameClub(found.name, alias)) return data;
  const aliases = found.aliases.filter((a) => !sameClub(a, alias));
  if (aliases.length === 0) {
    return withEntry(data, found, found.design ? { name: found.name, design: found.design } : null);
  }
  return withEntry(data, found, { ...found, aliases });
}

/** This club's own blade, from the club settings. */
export function ownBlade(club: Pick<ClubConfig, "colors">): BladeDesign {
  return club.colors.blade;
}

/** The blade for a crew name: the club's own, an admin-entered one, or null. */
export function bladeFor(crew: string, data: BladeData, club: ClubConfig): BladeDesign | null {
  if (matchClub(crew, club) === "match") return ownBlade(club);
  return findClub(data, crew)?.design ?? null;
}

/**
 * Other clubs in the stored results, most entries first, for the blade editor. Merged
 * names count toward the club they were merged into.
 */
export function otherClubs(
  records: StoredRegatta[],
  club: ClubConfig,
  blades: BladeData = EMPTY_BLADES,
): { name: string; entries: number }[] {
  const counts = new Map<string, { name: string; entries: number }>();
  for (const { regatta } of records) {
    for (const event of regatta.events) {
      for (const { crew } of event.entries) {
        if (matchClub(crew, club) === "match" || !crew.trim()) continue;
        const name = findClub(blades, crew)?.name ?? crewClub(crew);
        const key = clubKey(name);
        const found = counts.get(key) ?? { name, entries: 0 };
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

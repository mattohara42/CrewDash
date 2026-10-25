import { normalizeName } from "../club.js";
import type { Lineup, RegattaLineups, Seat } from "./lineups.js";

// The club's rowers, so lineups pick people instead of retyping names. One list for the
// club, with the seasons each rower is on, so a rower keeps their id (and their page and
// followers) from one season to the next. A season is a calendar year for now.

export interface RosterRower {
  // The rower's name, normalized, when they were added (with " 2" etc. if taken). It never
  // changes on rename, and it matches the keys phones already follow by.
  id: string;
  name: string;
  // Free text, like "Boys Novice". Puts the likely rowers first when filling a boat.
  squad: string;
  role: "rower" | "cox";
  seasons: string[];
}

export interface Roster {
  rowers: RosterRower[];
}

export const EMPTY_ROSTER: Roster = { rowers: [] };
const MAX_NAME = 60;
const MAX_SQUAD = 40;

export const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

export function parseRoster(value: unknown): Roster {
  const v = value as Partial<Roster> | null;
  if (!v || !Array.isArray(v.rowers)) return EMPTY_ROSTER;
  return {
    rowers: v.rowers.filter(
      (r): r is RosterRower =>
        !!r &&
        typeof r.id === "string" &&
        typeof r.name === "string" &&
        typeof r.squad === "string" &&
        (r.role === "rower" || r.role === "cox") &&
        Array.isArray(r.seasons) &&
        r.seasons.every((s) => typeof s === "string"),
    ),
  };
}

/** A season's rowers, by name. */
export function seasonRowers(roster: Roster, season: string): RosterRower[] {
  return roster.rowers
    .filter((r) => r.seasons.includes(season))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findById(roster: Roster, id: string): RosterRower | undefined {
  return roster.rowers.find((r) => r.id === id);
}

/** The rower with this name, ignoring case and spacing. */
export function findByName(roster: Roster, name: string): RosterRower | undefined {
  const key = normalizeName(name);
  return roster.rowers.find((r) => normalizeName(r.name) === key);
}

/**
 * Adds a rower to a season. Someone already on the roster with the same name (ignoring
 * case and spacing) is the same rower: they're added to the season instead of duplicated.
 */
export function addRower(
  roster: Roster,
  input: { name: string; squad?: string; role?: RosterRower["role"] },
  season: string,
): { roster: Roster; id: string | null } {
  const name = cleanName(input.name);
  if (!name) return { roster, id: null };
  const existing = findByName(roster, name);
  if (existing) {
    if (existing.seasons.includes(season)) return { roster, id: existing.id };
    return {
      roster: update(roster, existing.id, { seasons: [...existing.seasons, season].sort() }),
      id: existing.id,
    };
  }
  const base = normalizeName(name);
  const taken = new Set(roster.rowers.map((r) => r.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base} ${n}`;
  const rower: RosterRower = {
    id,
    name,
    squad: (input.squad ?? "").trim().slice(0, MAX_SQUAD),
    role: input.role ?? "rower",
    seasons: [season],
  };
  return { roster: { rowers: [...roster.rowers, rower] }, id };
}

function update(roster: Roster, id: string, change: Partial<RosterRower>): Roster {
  return { rowers: roster.rowers.map((r) => (r.id === id ? { ...r, ...change, id } : r)) };
}

/** Saves edits to a season's rowers. A blank name keeps the old one. */
export function editRowers(
  roster: Roster,
  season: string,
  edits: { id: string; name: string; squad: string; role: string; remove: boolean }[],
): Roster {
  let next = roster;
  for (const e of edits) {
    const rower = findById(next, e.id);
    if (!rower) continue;
    if (e.remove) {
      // Off this season's roster. Their past races and page stay.
      next = update(next, e.id, { seasons: rower.seasons.filter((s) => s !== season) });
      continue;
    }
    next = update(next, e.id, {
      name: cleanName(e.name) || rower.name,
      squad: e.squad.trim().slice(0, MAX_SQUAD),
      role: e.role === "cox" ? "cox" : "rower",
    });
  }
  return next;
}

/** Folds one rower into another: same seasons, and every lineup seat moves over. */
export function mergeRowers(roster: Roster, fromId: string, intoId: string): Roster {
  const from = findById(roster, fromId);
  const into = findById(roster, intoId);
  if (!from || !into || fromId === intoId) return roster;
  const seasons = [...new Set([...into.seasons, ...from.seasons])].sort();
  return {
    rowers: roster.rowers
      .filter((r) => r.id !== fromId)
      .map((r) => (r.id === intoId ? { ...r, seasons } : r)),
  };
}

/** Lineups with every seat for one rower moved to another. */
export function relinkLineups(
  lineups: RegattaLineups,
  fromId: string,
  intoId: string,
  intoName: string,
) {
  const move = (seat: Seat): Seat =>
    seat.rowerId === fromId ? { ...seat, rowerId: intoId, name: intoName } : seat;
  return Object.fromEntries(
    Object.entries(lineups).map(([key, l]) => [
      key,
      { ...l, seats: l.seats.map(move), cox: l.cox && move(l.cox) },
    ]),
  ) as RegattaLineups;
}

/**
 * Links typed-in lineup names to roster rowers, adding anyone missing to the season.
 * Lineups entered before the roster existed are converted this way. Returns null for
 * lineups when nothing needed linking.
 */
export function linkLineups(
  roster: Roster,
  lineups: RegattaLineups,
  season: string,
): { roster: Roster; lineups: RegattaLineups | null } {
  let next = roster;
  let changed = false;
  const link = (seat: Seat, role: RosterRower["role"]): Seat => {
    if (!seat.name || (seat.rowerId && findById(next, seat.rowerId))) return seat;
    const added = addRower(next, { name: seat.name, role }, season);
    if (!added.id) return seat;
    next = added.roster;
    changed = true;
    return { ...seat, rowerId: added.id };
  };
  const linked = Object.fromEntries(
    Object.entries(lineups).map(([key, l]): [string, Lineup] => [
      key,
      { ...l, seats: l.seats.map((s) => link(s, "rower")), cox: l.cox && link(l.cox, "cox") },
    ]),
  );
  return { roster: next, lineups: changed ? linked : null };
}

/** Whether a rower's squad fits an event, e.g. "Boys Novice" for "Boys Freshman/Novice 8+". */
export function squadFits(squad: string, eventName: string): boolean {
  const words = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    );
  const want = [...words(squad)];
  if (want.length === 0) return false;
  const have = words(eventName);
  return want.every((w) => have.has(w));
}

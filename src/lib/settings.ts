import { normalizeName, type ClubIdentity } from "../club.js";

// Admin choices that live in the app instead of in git, so an admin can make
// them without changing the club settings.
export interface Settings {
  // Crew names added before club settings moved to Admin. moveExtraAliases() in
  // club-settings.ts moves them into the club's own names and empties this.
  extraAliases: string[];
  // Renamed or split events: normalized event name -> the name to group it under.
  eventAliases: Record<string, string>;
}

export const EMPTY_SETTINGS: Settings = { extraAliases: [], eventAliases: {} };

export function parseSettings(value: unknown): Settings {
  const v = (value ?? {}) as Partial<Settings>;
  return {
    extraAliases: Array.isArray(v.extraAliases)
      ? v.extraAliases.filter((a): a is string => typeof a === "string")
      : [],
    eventAliases:
      v.eventAliases && typeof v.eventAliases === "object"
        ? Object.fromEntries(
            Object.entries(v.eventAliases).filter(([, to]) => typeof to === "string"),
          )
        : {},
  };
}

/** The club config with any not-yet-moved extra aliases added, so they count meanwhile. */
export function effectiveClub<T extends ClubIdentity>(club: T, settings: Settings): T {
  const seen = new Set(club.aliases.map(normalizeName));
  const extra = settings.extraAliases.filter((a) => !seen.has(normalizeName(a)));
  return { ...club, aliases: [...club.aliases, ...extra] };
}

/** The key an event is grouped under across regattas, after any admin merges. */
export function eventKey(name: string, settings: Settings): string {
  const key = normalizeName(name);
  const merged = settings.eventAliases[key];
  return merged ? normalizeName(merged) : key;
}

export function mergeEvent(settings: Settings, from: string, into: string): Settings {
  const fromKey = normalizeName(from);
  const intoKey = normalizeName(into);
  if (!fromKey || !intoKey || fromKey === intoKey) return settings;
  // Anything already merged into `from` follows it into `into`, so merges never chain.
  const eventAliases = Object.fromEntries(
    Object.entries(settings.eventAliases).map(([k, v]) => [
      k,
      normalizeName(v) === fromKey ? into.trim() : v,
    ]),
  );
  eventAliases[fromKey] = into.trim();
  return { ...settings, eventAliases };
}

export function unmergeEvent(settings: Settings, from: string): Settings {
  const eventAliases = { ...settings.eventAliases };
  delete eventAliases[normalizeName(from)];
  return { ...settings, eventAliases };
}

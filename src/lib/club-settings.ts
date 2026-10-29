import { designFromForm } from "./blade.js";
import { colorProblems, normalizeName, parseClubConfig, type ClubConfig } from "../club.js";
import { club, clubFromFile } from "./config.js";
import type { Settings } from "./settings.js";
import type { RegattaStore } from "./store.js";

// The club's settings live in Netlify Blobs so an admin can change them without editing
// files or rebuilding. Each server instance keeps them for a short while rather than reading
// Blobs on every request. Every request on a site sees the same settings, so updating the
// shared object can't mix one club's settings with another's.

const FRESH_MS = 30_000;
let loadedAt = Number.NEGATIVE_INFINITY;
let loaded = false;
let saved = false;

/** True once an admin has saved settings, rather than the site running on club.json. */
export function clubIsSetUp(): boolean {
  return saved;
}

function apply(next: ClubConfig, isSaved: boolean, now: number): void {
  Object.assign(club, next);
  loaded = true;
  saved = isSaved;
  loadedAt = now;
}

/**
 * Brings `club` up to date with the saved settings, at most every 30 seconds. With nothing
 * saved it uses club.json. If Blobs can't be read, or what's saved doesn't pass the checks,
 * the settings already in use stay and the problem is logged. A server that has never read
 * them throws instead: club.json is only a placeholder, and running on it would match none
 * of the club's boats (losing alerts) and show the admin an empty setup form to save over
 * the real settings.
 */
export async function loadClub(
  read: () => Promise<unknown>,
  now: number = Date.now(),
): Promise<ClubConfig> {
  if (now - loadedAt < FRESH_MS) return club;
  try {
    const value = await read();
    if (value === null || value === undefined) apply(clubFromFile(), false, now);
    else apply(parseClubConfig(value), true, now);
  } catch (err) {
    if (!loaded) throw new Error("Couldn't load the club settings.", { cause: err });
    // Try again after the usual wait rather than on every request.
    loadedAt = now;
    console.error("Loading the club settings failed:", err);
  }
  return club;
}

/** Puts settings an admin just saved into use straight away on this server. */
export function useClub(next: ClubConfig, now: number = Date.now()): void {
  apply(next, true, now);
}

/** The settings form's fields in club.json's shape, for parseClubConfig to check. */
export function clubFromForm(field: (name: string) => string): Record<string, unknown> {
  return {
    name: field("name"),
    aliases: field("aliases")
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean),
    timezone: field("timezone"),
    locale: field("locale"),
    units: field("units") === "metric" ? "metric" : "imperial",
    seasonStartMonth: Number(field("seasonStartMonth")),
    colors: {
      primary: field("primary"),
      secondary: field("secondary"),
      accent: field("accent"),
      blade: designFromForm(field, "blade"),
      chart: {
        light: { strong: field("chartLightStrong"), muted: field("chartLightMuted") },
        dark: { strong: field("chartDarkStrong"), muted: field("chartDarkMuted") },
      },
    },
  };
}

/** The club to save, or what's wrong with the settings: a bad value or hard-to-read colors. */
export function checkClub(value: unknown): { club: ClubConfig } | { error: string } {
  try {
    const checked = parseClubConfig(value);
    const problems = colorProblems(checked.colors);
    return problems.length > 0 ? { error: problems.join(" ") } : { club: checked };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/** The club with one more crew name it races under. Names already there are left alone. */
export function withAlias(current: ClubConfig, name: string): ClubConfig {
  const key = normalizeName(name);
  if (!key || current.aliases.some((a) => normalizeName(a) === key)) return current;
  return { ...current, aliases: [...current.aliases, name.trim()] };
}

/** The club without a crew name, ignoring case and spacing. */
export function withoutAlias(current: ClubConfig, name: string): ClubConfig {
  const key = normalizeName(name);
  return { ...current, aliases: current.aliases.filter((a) => normalizeName(a) !== key) };
}

/** Checks the club and, if it passes, saves it and puts it into use. Returns what's wrong, if anything. */
export async function saveClub(store: RegattaStore, next: unknown): Promise<string | null> {
  const checked = checkClub(next);
  if ("error" in checked) return checked.error;
  await store.putClub(checked.club);
  useClub(checked.club);
  return null;
}

/**
 * Before club settings moved to Admin, extra crew names were kept in a separate list in the
 * admin settings. This moves them into the club's own names, once, then empties that list.
 * Until it runs (the club must be set up first) effectiveClub() still counts them, so no name
 * stops counting along the way. A failure leaves both lists as they were.
 */
export async function moveExtraAliases(store: RegattaStore, settings: Settings): Promise<void> {
  if (!clubIsSetUp() || settings.extraAliases.length === 0) return;
  try {
    const next = settings.extraAliases.reduce(withAlias, { ...club });
    const problem = await saveClub(store, next);
    if (problem) throw new Error(problem);
    await store.putSettings({ ...settings, extraAliases: [] });
  } catch (err) {
    console.error("Moving the extra crew names into club settings failed:", err);
  }
}

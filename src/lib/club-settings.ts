import { colorProblems, parseClubConfig, type ClubConfig } from "../club.js";
import { club, clubFromFile } from "./config.js";

// The club's settings live in Netlify Blobs so an admin can change them without editing
// files or rebuilding. Each server instance keeps them for a short while rather than reading
// Blobs on every request. Every request on a site sees the same settings, so updating the
// shared object can't mix one club's settings with another's.

const FRESH_MS = 30_000;
let loadedAt = Number.NEGATIVE_INFINITY;
let saved = false;

/** True once an admin has saved settings, rather than the site running on club.json. */
export function clubIsSetUp(): boolean {
  return saved;
}

function apply(next: ClubConfig, isSaved: boolean, now: number): void {
  Object.assign(club, next);
  saved = isSaved;
  loadedAt = now;
}

/**
 * Brings `club` up to date with the saved settings, at most every 30 seconds. With nothing
 * saved it uses club.json. If Blobs can't be read, or what's saved doesn't pass the checks,
 * the settings already in use stay and the problem is logged.
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
      blade: { base: field("bladeBase"), tip: field("bladeTip") },
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

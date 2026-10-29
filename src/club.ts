// Everything club-specific is in the club's settings, edited by an admin at /admin/club and
// stored in Netlify Blobs. club.json at the repo root holds the starting values used until
// then. The same rules check both, so messages name the setting, not the file.
import { parseDesign, type BladeDesign } from "./lib/blade.js";
import { contrast } from "./lib/color.js";

export interface ChartColors {
  // Bars and this year's marks.
  strong: string;
  // Last year's marks in year-over-year charts.
  muted: string;
}

export interface ClubColors {
  // Header background. White text sits on it, so it must be dark.
  primary: string;
  // The two stripes under the header.
  secondary: string;
  accent: string;
  // Chart colors per theme. Run them through a palette validator before changing.
  chart: { light: ChartColors; dark: ChartColors };
  // The club's oar blade, drawn like other clubs' blades (see lib/blade.ts).
  blade: BladeDesign;
}

// What results matching needs: the club's name and the names it races under.
export interface ClubIdentity {
  name: string;
  // Exact crew names this club appears under in CrewTimer results.
  aliases: string[];
}

export interface ClubConfig extends ClubIdentity {
  colors: ClubColors;
  // IANA time zone for race-day times and "today". Defaults to US Eastern.
  timezone: string;
  // Units for weather: mph and °F, or km/h and °C.
  units: "imperial" | "metric";
  // BCP 47 language tag for how dates, times and numbers are written, like "en-GB".
  locale: string;
  // The month a season starts, 1 to 12. 1 makes a season a calendar year. Clubs that
  // race September to June, or in the southern summer, start it in the autumn.
  seasonStartMonth: number;
}

export const DEFAULT_TIMEZONE = "America/New_York";
const MAX_NAME = 100;
const MAX_ALIASES = 30;
export const DEFAULT_LOCALE = "en-US";

function parseLocale(value: unknown): string {
  if (value === undefined) return DEFAULT_LOCALE;
  try {
    if (typeof value !== "string" || value.trim() === "") throw new Error();
    return Intl.getCanonicalLocales(value)[0]!;
  } catch {
    throw new Error('Locale must be a language tag like "en-US" or "en-GB".');
  }
}

function parseSeasonStart(value: unknown): number {
  if (value === undefined) return 1;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error("Season start must be a month from 1 to 12.");
  }
  return value;
}

function parseTimezone(value: unknown): string {
  if (value === undefined) return DEFAULT_TIMEZONE;
  try {
    if (typeof value !== "string") throw new Error();
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    throw new Error('Time zone must be an IANA time zone like "America/New_York".');
  }
}

export const DEFAULT_COLORS: ClubColors = {
  primary: "#1f3b73",
  secondary: "#2f6fb5",
  accent: "#e0a100",
  chart: {
    light: { strong: "#3b5bb0", muted: "#a3b4de" },
    dark: { strong: "#b8860b", muted: "#6e5414" },
  },
  blade: { base: "#2f6fb5", layers: [{ shape: "tips", color: "#e0a100" }] },
};

const HEX = /^#[0-9a-f]{6}$/i;

function hex(value: unknown, fallback: string, field: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !HEX.test(value)) {
    throw new Error(`Color ${field} must be a hex color like "#0e1a45".`);
  }
  return value;
}

function parseBlade(value: unknown, secondary: string, accent: string): BladeDesign {
  const v = (value ?? {}) as Record<string, unknown>;
  if (v.layers !== undefined) {
    const design = parseDesign(v);
    if (!design) {
      throw new Error(
        "The blade needs a hex base color and at most 3 layers, each a shape and a hex color.",
      );
    }
    return design;
  }
  // Settings saved before blades had layers hold a base color and a tip color. Without
  // either, the blade uses the stripe colors.
  return {
    base: hex(v.base, secondary, "blade.base"),
    layers: [{ shape: "tips", color: hex(v.tip, accent, "blade.tip") }],
  };
}

function parseColors(value: unknown): ClubColors {
  const v = (value ?? {}) as Record<string, unknown>;
  const chart = (v.chart ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const theme = (mode: "light" | "dark"): ChartColors => ({
    strong: hex(chart[mode]?.strong, DEFAULT_COLORS.chart[mode].strong, `chart.${mode}.strong`),
    muted: hex(chart[mode]?.muted, DEFAULT_COLORS.chart[mode].muted, `chart.${mode}.muted`),
  });
  const secondary = hex(v.secondary, DEFAULT_COLORS.secondary, "secondary");
  const accent = hex(v.accent, DEFAULT_COLORS.accent, "accent");
  return {
    primary: hex(v.primary, DEFAULT_COLORS.primary, "primary"),
    secondary,
    accent,
    chart: { light: theme("light"), dark: theme("dark") },
    blade: parseBlade(v.blade, secondary, accent),
  };
}

// Page surfaces from src/layouts/Base.astro, light and dark. Keep in sync if they change.
export const LIGHT_SURFACE = "#ffffff";
export const DARK_SURFACE = "#141a2e";

/** What makes these colors hard to read, if anything. Saving club settings refuses them. */
export function colorProblems(colors: ClubColors): string[] {
  const problems: string[] = [];
  if (contrast("#ffffff", colors.primary) < 4.5) {
    problems.push("The header color is too light for white text. Pick a darker one.");
  }
  if (contrast(colors.chart.light.strong, LIGHT_SURFACE) < 3) {
    problems.push("The light-theme chart color is too pale to see on white.");
  }
  if (contrast(colors.chart.dark.strong, DARK_SURFACE) < 3) {
    problems.push("The dark-theme chart color is too dark to see in dark mode.");
  }
  return problems;
}

export type ClubMatch = "match" | "near" | "none";

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseClubConfig(value: unknown): ClubConfig {
  const v = value as Partial<ClubConfig> | null;
  if (
    !v ||
    typeof v.name !== "string" ||
    v.name.trim() === "" ||
    !Array.isArray(v.aliases) ||
    v.aliases.length === 0 ||
    !v.aliases.every((a) => typeof a === "string" && a.trim() !== "")
  ) {
    throw new Error("Give the club a name and at least one name it races under.");
  }
  if (v.name.length > MAX_NAME || v.aliases.some((a) => a.length > MAX_NAME)) {
    throw new Error(`Names can be at most ${MAX_NAME} characters.`);
  }
  if (v.aliases.length > MAX_ALIASES) {
    throw new Error(`List at most ${MAX_ALIASES} names the club races under.`);
  }
  return {
    name: v.name,
    aliases: v.aliases,
    colors: parseColors((v as { colors?: unknown }).colors),
    timezone: parseTimezone((v as { timezone?: unknown }).timezone),
    units: (v as { units?: unknown }).units === "metric" ? "metric" : "imperial",
    locale: parseLocale((v as { locale?: unknown }).locale),
    seasonStartMonth: parseSeasonStart((v as { seasonStartMonth?: unknown }).seasonStartMonth),
  };
}

/**
 * "match" when the crew name is one of the club's aliases (ignoring case and
 * spacing), with or without a boat letter such as "(A)" or "(B)". "near" when
 * it contains an alias but isn't one, such as "Pittsford Crew - Masters".
 * Near misses go to an admin to confirm, never counted automatically.
 */
export function matchClub(crew: string, club: ClubIdentity): ClubMatch {
  // Clubs with more than one boat in an event race as "Club (A)", "Club (B)".
  const name = normalizeName(crew).replace(/\s*\([a-z]\)$/, "");
  const aliases = club.aliases.map(normalizeName);
  if (aliases.includes(name)) return "match";
  if (aliases.some((alias) => name.includes(alias))) return "near";
  return "none";
}

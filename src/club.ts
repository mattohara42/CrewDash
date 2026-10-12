// Everything club-specific lives in club.json at the repo root. Another club
// forks the repo and edits that file.

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
}

export const DEFAULT_TIMEZONE = "America/New_York";

function parseTimezone(value: unknown): string {
  if (value === undefined) return DEFAULT_TIMEZONE;
  try {
    if (typeof value !== "string") throw new Error();
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    throw new Error('club.json timezone must be an IANA time zone like "America/New_York"');
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
};

const HEX = /^#[0-9a-f]{6}$/i;

function hex(value: unknown, fallback: string, field: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !HEX.test(value)) {
    throw new Error(`club.json colors.${field} must be a hex color like "#0e1a45"`);
  }
  return value;
}

function parseColors(value: unknown): ClubColors {
  const v = (value ?? {}) as Record<string, unknown>;
  const chart = (v.chart ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const theme = (mode: "light" | "dark"): ChartColors => ({
    strong: hex(chart[mode]?.strong, DEFAULT_COLORS.chart[mode].strong, `chart.${mode}.strong`),
    muted: hex(chart[mode]?.muted, DEFAULT_COLORS.chart[mode].muted, `chart.${mode}.muted`),
  });
  return {
    primary: hex(v.primary, DEFAULT_COLORS.primary, "primary"),
    secondary: hex(v.secondary, DEFAULT_COLORS.secondary, "secondary"),
    accent: hex(v.accent, DEFAULT_COLORS.accent, "accent"),
    chart: { light: theme("light"), dark: theme("dark") },
  };
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
    !Array.isArray(v.aliases) ||
    v.aliases.length === 0 ||
    !v.aliases.every((a) => typeof a === "string" && a.trim() !== "")
  ) {
    throw new Error('club.json needs a "name" and a non-empty "aliases" list of names');
  }
  return {
    name: v.name,
    aliases: v.aliases,
    colors: parseColors((v as { colors?: unknown }).colors),
    timezone: parseTimezone((v as { timezone?: unknown }).timezone),
  };
}

/**
 * "match" when the crew name is one of the club's aliases (ignoring case and
 * spacing). "near" when it contains an alias but isn't one, such as
 * "Pittsford Crew - Masters". Near misses go to an admin to confirm, never
 * counted automatically.
 */
export function matchClub(crew: string, club: ClubIdentity): ClubMatch {
  const name = normalizeName(crew);
  const aliases = club.aliases.map(normalizeName);
  if (aliases.includes(name)) return "match";
  if (aliases.some((alias) => name.includes(alias))) return "near";
  return "none";
}

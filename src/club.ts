// Everything club-specific lives in club.json at the repo root. Another club
// forks the repo and edits that file.

export interface ClubConfig {
  name: string;
  // Exact crew names this club appears under in CrewTimer results.
  aliases: string[];
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
  return { name: v.name, aliases: v.aliases };
}

/**
 * "match" when the crew name is one of the club's aliases (ignoring case and
 * spacing). "near" when it contains an alias but isn't one, such as
 * "Pittsford Crew - Masters". Near misses go to an admin to confirm, never
 * counted automatically.
 */
export function matchClub(crew: string, club: ClubConfig): ClubMatch {
  const name = normalizeName(crew);
  const aliases = club.aliases.map(normalizeName);
  if (aliases.includes(name)) return "match";
  if (aliases.some((alias) => name.includes(alias))) return "near";
  return "none";
}

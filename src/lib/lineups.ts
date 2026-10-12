// Who sat where, entered by coaches. RegattaCentral's API isn't open to clubs (see HANDOFF.md),
// so lineups are typed in. Stored per regatta, keyed by event number and bow number.

export interface Lineup {
  // Bow seat first, stroke last.
  seats: string[];
  cox: string;
  from: string;
  at: string;
}

export type RegattaLineups = Record<string, Lineup>;

// An eight is the biggest boat. A little room for spares typed by mistake.
const MAX_SEATS = 9;
const MAX_NAME = 60;

export function lineupKey(eventNum: string, bow: string): string {
  return `${eventNum}:${bow}`;
}

export function parseLineups(value: unknown): RegattaLineups {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, l]) => {
      const v = l as Partial<Lineup> | null;
      return (
        !!v &&
        Array.isArray(v.seats) &&
        v.seats.every((s) => typeof s === "string") &&
        typeof v.cox === "string" &&
        typeof v.from === "string" &&
        typeof v.at === "string"
      );
    }),
  ) as RegattaLineups;
}

const clean = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

/** Sets a boat's lineup from the coach's form, or clears it when every field is blank. */
export function setLineup(
  lineups: RegattaLineups,
  key: string,
  input: { seats: string; cox: string; from: string },
  now: Date = new Date(),
): RegattaLineups {
  const seats = input.seats.split("\n").map(clean).filter(Boolean).slice(0, MAX_SEATS);
  const cox = clean(input.cox);
  const next = { ...lineups };
  if (seats.length === 0 && !cox) delete next[key];
  else next[key] = { seats, cox, from: input.from, at: now.toISOString() };
  return next;
}

/** "Bow", "2", "3", "Stroke" for a boat of this many rowers. A single is just "Sculler". */
export function seatLabels(count: number): string[] {
  if (count === 1) return ["Sculler"];
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? "Bow" : i === count - 1 ? "Stroke" : String(i + 1),
  );
}

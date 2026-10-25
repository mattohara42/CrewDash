// Who sat where, entered by coaches from the club roster (roster.ts). RegattaCentral's API
// isn't open to clubs (see HANDOFF.md). Stored per regatta, keyed by event and bow number.

// One seat in a boat. The name is kept as entered, so a lineup still reads if its rower is
// later removed. Older lineups were typed before the roster existed and have no rowerId
// until they're linked (see roster.ts).
export interface Seat {
  name: string;
  rowerId?: string;
  // Filling in for someone who usually rows this event, e.g. a varsity rower in a novice
  // boat. The regatta may make the boat an exhibition boat, which CrewTimer reports.
  sub?: boolean;
}

export interface Lineup {
  // Bow seat first, stroke last. A seat not filled yet has an empty name, so the others
  // keep their places.
  seats: Seat[];
  cox: Seat | null;
  from: string;
  at: string;
}

export type RegattaLineups = Record<string, Lineup>;

// An eight is the biggest boat. A little room for spares.
export const MAX_SEATS = 9;
// The seat picker's "New rower..." option.
export const NEW_ROWER = "__new";
const MAX_NAME = 60;

export function lineupKey(eventNum: string, bow: string): string {
  return `${eventNum}:${bow}`;
}

function parseSeat(value: unknown): Seat | null {
  // Lineups typed before the roster stored plain names.
  if (typeof value === "string") return { name: value };
  const v = value as Partial<Seat> | null;
  if (!v || typeof v.name !== "string") return null;
  return {
    name: v.name,
    ...(typeof v.rowerId === "string" && { rowerId: v.rowerId }),
    ...(v.sub === true && { sub: true }),
  };
}

export function parseLineups(value: unknown): RegattaLineups {
  if (!value || typeof value !== "object") return {};
  const out: RegattaLineups = {};
  for (const [key, l] of Object.entries(value as Record<string, unknown>)) {
    const v = l as { seats?: unknown; cox?: unknown; from?: unknown; at?: unknown } | null;
    if (!v || !Array.isArray(v.seats) || typeof v.from !== "string" || typeof v.at !== "string") {
      continue;
    }
    const seats = v.seats.map(parseSeat);
    if (seats.some((s) => s === null)) continue;
    const cox = parseSeat(v.cox);
    out[key] = { seats: seats as Seat[], cox: cox?.name ? cox : null, from: v.from, at: v.at };
  }
  return out;
}

const clean = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

/** Sets a boat's lineup, or clears it when there's nobody in it. Empty seats keep their place. */
export function setLineup(
  lineups: RegattaLineups,
  key: string,
  input: { seats: (Seat | null)[]; cox: Seat | null; from: string },
  now: Date = new Date(),
): RegattaLineups {
  const tidy = (s: Seat | null): Seat | null =>
    s && clean(s.name) ? { ...s, name: clean(s.name) } : null;
  const seats = input.seats.slice(0, MAX_SEATS).map((s) => tidy(s) ?? { name: "" });
  const cox = tidy(input.cox);
  const next = { ...lineups };
  if (seats.every((s) => !s.name) && !cox) delete next[key];
  else next[key] = { seats, cox, from: input.from, at: now.toISOString() };
  return next;
}

/** Rowers and whether there's a cox, from the boat class at the end of an event name. */
export function boatSize(eventName: string): { rowers: number; cox: boolean } {
  const m = /\b([1248])\s*x?\s*([+-])?\s*$/i.exec(eventName.trim());
  if (!m) return { rowers: 8, cox: true };
  return { rowers: Number(m[1]), cox: m[2] === "+" };
}

/** "Bow", "2", "3", "Stroke" for a boat of this many rowers. A single is just "Sculler". */
export function seatLabels(count: number): string[] {
  if (count === 1) return ["Sculler"];
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? "Bow" : i === count - 1 ? "Stroke" : String(i + 1),
  );
}

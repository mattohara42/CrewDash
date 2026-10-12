// Coach's notes on a regatta, one for the regatta as a whole ("") and one per event key.
// Visible to the whole club, written by coaches and admins.

export interface Note {
  text: string;
  from: string;
  at: string;
}

export type RegattaNotes = Record<string, Note>;

export const MAX_NOTE = 1000;

export function parseNotes(value: unknown): RegattaNotes {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, n]) =>
        !!n &&
        typeof (n as Note).text === "string" &&
        typeof (n as Note).from === "string" &&
        typeof (n as Note).at === "string",
    ),
  ) as RegattaNotes;
}

/** Sets or, with blank text, clears one note. */
export function setNote(
  notes: RegattaNotes,
  key: string,
  text: string,
  from: string,
  now: Date = new Date(),
): RegattaNotes {
  const next = { ...notes };
  const trimmed = text.trim().slice(0, MAX_NOTE);
  if (trimmed) next[key] = { text: trimmed, from, at: now.toISOString() };
  else delete next[key];
  return next;
}

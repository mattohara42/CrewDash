// Parsers for the string fields in CrewTimer results.

const TIME = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/;

/** Parses "MM:SS.mmm" or "H:MM:SS.mmm" into milliseconds. Returns null if it isn't a time. */
export function parseTime(text: string): number | null {
  const m = TIME.exec(text.trim());
  if (!m) return null;
  const [, hours, minutes, seconds, fraction] = m;
  if (Number(seconds) >= 60 || (hours !== undefined && Number(minutes) >= 60)) return null;
  const millis = Number((fraction ?? "").padEnd(3, "0"));
  return ((Number(hours ?? 0) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + millis;
}

export interface Penalty {
  code: string;
  // Null when the code has no "(Ns)" amount.
  seconds: number | null;
}

export interface PenaltyInfo {
  penalties: Penalty[];
  averageAge: number | null;
  handicapSeconds: number | null;
  exhibition: boolean;
}

const AGE = /^Age\s+(\d+(?:\.\d+)?)\((-?\d+(?:\.\d+)?)\)$/i;
const TIMED_PENALTY = /^(.+?)\((-?\d+(?:\.\d+)?)s\)$/;

/** Splits a PenaltyCode such as "buoy(5s), Age 16(-1.8)" into its parts. */
export function parsePenaltyCode(text: string | undefined): PenaltyInfo {
  const info: PenaltyInfo = {
    penalties: [],
    averageAge: null,
    handicapSeconds: null,
    exhibition: false,
  };
  for (const part of (text ?? "").split(",")) {
    const item = part.trim();
    if (!item) continue;
    const age = AGE.exec(item);
    if (age) {
      info.averageAge = Number(age[1]);
      info.handicapSeconds = Number(age[2]);
      continue;
    }
    if (/^exhib(ition)?$/i.test(item)) {
      info.exhibition = true;
      continue;
    }
    const timed = TIMED_PENALTY.exec(item);
    info.penalties.push(
      timed ? { code: timed[1]!.trim(), seconds: Number(timed[2]) } : { code: item, seconds: null },
    );
  }
  return info;
}

import type { RawRegattaResults } from "./raw.js";

const RESULTS_BASE = "https://crewtimer-results.firebaseio.com/results";
const REGATTA_ID = /^r\d+$/;

/** Accepts "r16329" or a link like "https://www.crewtimer.com/regatta/r16329". */
export function regattaIdFrom(input: string): string | null {
  const text = input.trim();
  if (REGATTA_ID.test(text)) return text;
  const m = /crewtimer\.com\/regatta\/(r\d+)(?:[/?#]|$)/i.exec(text);
  return m ? m[1]! : null;
}

export async function fetchRegattaResults(
  regattaId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RawRegattaResults> {
  if (!REGATTA_ID.test(regattaId)) {
    throw new Error(`Not a CrewTimer regatta id: ${regattaId}`);
  }
  const res = await fetchImpl(`${RESULTS_BASE}/${regattaId}.json`);
  if (!res.ok) {
    throw new Error(`CrewTimer returned ${res.status} for ${regattaId}`);
  }
  const body = (await res.json()) as RawRegattaResults | null;
  // Firebase answers an unknown path with 200 and null.
  if (body === null) {
    throw new Error(`No CrewTimer results found for ${regattaId}`);
  }
  return body;
}

/**
 * CrewTimer's "lastUpdatedEvent" field, a few bytes, or null if it can't be read. It may let
 * the refresh skip downloading the whole results file when nothing changed. For now it's
 * only compared with what the full download found (see refresh.ts), to learn whether it
 * changes every time results or start times do.
 */
export async function fetchChangeMarker(
  regattaId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!REGATTA_ID.test(regattaId)) return null;
  try {
    const res = await fetchImpl(`${RESULTS_BASE}/${regattaId}/lastUpdatedEvent.json`);
    if (!res.ok) return null;
    const value: unknown = await res.json();
    return typeof value === "string" || typeof value === "number" ? String(value) : null;
  } catch {
    return null;
  }
}

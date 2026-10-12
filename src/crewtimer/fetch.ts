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

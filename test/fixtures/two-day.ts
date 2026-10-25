import type { RawEvent, RawRegattaResults } from "../../src/crewtimer/raw.js";
import fixture from "./regatta.json" with { type: "json" };

// The made-up regatta as a two-day one: event 12 on Saturday 2026-10-10, event 13 on Sunday.
export function twoDayRaw(
  dayList: RawRegattaResults["regattaInfo"]["DayList"] = ["Saturday", "Sunday"],
) {
  const raw = structuredClone(fixture) as RawRegattaResults;
  const results = raw.results as RawEvent[];
  results[0]!.Day = "Saturday";
  results[1]!.Day = "Sunday";
  raw.regattaInfo = { ...raw.regattaInfo, Date: "2026-10-10", DayList: dayList };
  return raw;
}

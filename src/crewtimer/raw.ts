// Shape of CrewTimer's public results JSON, as served from
// https://crewtimer-results.firebaseio.com/results/<regattaId>.json
// This is not a documented API. Only fields CrewDash uses are listed.

export interface RawEntry {
  Bow: string;
  Crew: string;
  CrewAbbrev?: string;
  Stroke?: string;
  // A number once placed, "" otherwise (exhibition, DNS, not yet finished).
  Place: number | string;
  // "MM:SS.mmm", or "" when there is no time.
  RawTime: string;
  // "MM:SS.mmm", or a status such as "DNS", or "Exh MM:SS.mmm" for exhibition.
  AdjTime: string;
  // Comma-separated, e.g. "buoy(5s), Age 16(0)". The bracketed Age number is
  // the handicap in seconds.
  PenaltyCode?: string;
  // Time of day the boat crossed the start, "HH:MM:SS.mmm", once it has started.
  G_Start_time_raw?: string;
}

export interface RawEvent {
  // Includes the event number, e.g. "23 Mens HS Novice 4+".
  Event: string;
  EventNum: string;
  RaceType?: string;
  Start?: string;
  // Which day of a multi-day regatta, as named in RawRegattaInfo.DayList, e.g. "Sunday".
  Day?: string;
  Official?: boolean;
  // Firebase returns arrays with gaps as objects keyed by index.
  entries?: RawEntry[] | Record<string, RawEntry>;
}

export interface RawRegattaInfo {
  Title: string;
  // The first day, "YYYY-MM-DD".
  Date: string;
  // Day names in order, e.g. ["Saturday", "Sunday"]. Missing or one long for one-day regattas.
  DayList?: string[] | Record<string, string>;
  RaceType?: string;
  ResultsPendOfficial?: boolean;
}

export interface RawRegattaResults {
  regattaInfo: RawRegattaInfo;
  results: RawEvent[] | Record<string, RawEvent>;
}

import { normalizeRegatta, addDays, type Regatta } from "../crewtimer/normalize.js";
import type { RawEntry, RawEvent } from "../crewtimer/raw.js";
import { club } from "../lib/config.js";
import { conditionsKey, type Conditions } from "../lib/conditions.js";
import { appendAlerts, type LoggedAlert } from "../lib/alert-log.js";
import { boatSize, lineupKey, type Lineup, type RegattaLineups } from "../lib/lineups.js";
import { resultNotices, startNotices } from "../lib/notify.js";
import { seriesKey } from "../lib/history.js";
import { rowerKey } from "../lib/rowers.js";
import type { RosterRower } from "../lib/roster.js";
import { EMPTY_SETTINGS } from "../lib/settings.js";
import { localDate, zonedInstant } from "../lib/today.js";
import type { VenueData } from "../lib/venues.js";
import type { BladeData } from "../lib/blades.js";
import { memoryStore, summarize, type RegattaStore, type StoredRegatta } from "../lib/store.js";

// A made-up club for screenshots and trying CrewDash out: run `npm run demo`. Every club,
// rower, regatta and venue here is fiction. Nothing is fetched and nothing is saved: the
// data lives in memory, and today's regatta is rebuilt around the current time on every
// read, so the race-day view always has some results in, one event racing and more to come.

const COACH = "Coach Rivera";
const FINISH_MARGIN_MIN = 3;
// Head race boats leave this far apart.
const BOAT_GAP_S = 20;

const OTHER_CLUBS = [
  ["Lakeview Rowing Club", "LRC"],
  ["Hillside Boat Club", "HBC"],
  ["Northgate Crew", "NGC"],
  ["Bayport Rowing Association", "BRA"],
  ["Cedar Falls Crew", "CFC"],
  ["Harbor Point Rowing", "HPR"],
  ["Maple Valley Rowing", "MVR"],
  ["Stonebridge Crew", "SBC"],
  ["Westfield Boat Club", "WBC"],
  ["Elm Park Rowing", "EPR"],
] as const;

// Blades for most rivals. Two are left without one, as an admin would find them.
const BLADES: BladeData = {
  clubs: [
    {
      name: "Lakeview Rowing Club",
      design: { base: "#1d3c8f", layers: [{ shape: "tips", color: "#ffffff" }] },
    },
    {
      name: "Hillside Boat Club",
      design: {
        base: "#ffffff",
        layers: [
          { shape: "chevron-tip", color: "#b22234" },
          { shape: "chevron-edge", color: "#1d3c8f" },
        ],
      },
    },
    {
      name: "Northgate Crew",
      design: { base: "#0b2545", layers: [{ shape: "band", color: "#e8b923" }] },
    },
    {
      name: "Bayport Rowing Association",
      design: { base: "#ffffff", layers: [{ shape: "halves", color: "#00796b" }] },
    },
    {
      name: "Cedar Falls Crew",
      design: { base: "#5b2a86", layers: [{ shape: "stripes", color: "#ffffff" }] },
    },
    {
      name: "Harbor Point Rowing",
      design: { base: "#e65100", layers: [{ shape: "spots", color: "#000000" }] },
    },
    {
      name: "Maple Valley Rowing",
      design: { base: "#7a1f1f", layers: [{ shape: "quarters", color: "#f5f5f5" }] },
    },
    {
      name: "Stonebridge Crew",
      design: {
        base: "#ffffff",
        layers: [
          { shape: "diagonal", color: "#2f4f4f" },
          { shape: "diagonal-line", color: "#e8b923" },
        ],
      },
    },
  ],
};

const SURNAMES = [
  "Abbott",
  "Barnes",
  "Castillo",
  "Doyle",
  "Ellison",
  "Fischer",
  "Grant",
  "Hayes",
  "Ingram",
  "Jensen",
  "Keller",
  "Lowe",
  "Mendez",
  "Nolan",
  "Ortiz",
  "Park",
  "Quinn",
  "Reyes",
  "Sutton",
  "Tran",
  "Underwood",
  "Vance",
  "Walsh",
  "Young",
];

interface DemoEvent {
  name: string;
  squad: string;
  // A typical winning time on a 4.8 km course, in seconds.
  seconds: number;
  clubBoats: number;
}

const EVENTS: DemoEvent[] = [
  { name: "Womens U19 1x", squad: "Girls Varsity", seconds: 1500, clubBoats: 1 },
  { name: "Mens U19 2x", squad: "Boys Varsity", seconds: 1350, clubBoats: 1 },
  { name: "Womens U17 4x", squad: "Girls U17", seconds: 1250, clubBoats: 1 },
  { name: "Mens U17 4+", squad: "Boys U17", seconds: 1300, clubBoats: 2 },
  { name: "Womens Novice 8+", squad: "Girls Novice", seconds: 1250, clubBoats: 1 },
  { name: "Mens Novice 4+", squad: "Boys Novice", seconds: 1380, clubBoats: 1 },
  { name: "Womens U19 8+", squad: "Girls Varsity", seconds: 1110, clubBoats: 2 },
  { name: "Mens U19 8+", squad: "Boys Varsity", seconds: 1040, clubBoats: 1 },
  { name: "Womens U19 4+", squad: "Girls U17", seconds: 1240, clubBoats: 1 },
];

const SQUADS: Record<string, string[]> = {
  "Girls Varsity": [
    "Maya Okafor",
    "Hannah Brooks",
    "Sofia Marchetti",
    "Grace Lindqvist",
    "Olivia Tran",
    "Chloe Danvers",
    "Emma Whitfield",
    "Ava Castellanos",
    "Lily Hartmann",
    "Zoe Abernathy",
    "Nora Kessler",
    "Isla Fontaine",
    "Ruby Calloway",
    "Mia Sorensen",
    "Leah Pemberton",
    "Clara Voss",
    "Josie Lam",
  ],
  "Boys Varsity": [
    "Ethan Mercer",
    "Liam Ashford",
    "Noah Kincaid",
    "Owen Delacroix",
    "Lucas Brennan",
    "Caleb Whitmore",
    "Jack Halvorsen",
    "Ben Okonkwo",
    "Sam Ridley",
    "Theo Marchand",
  ],
  "Girls U17": [
    "Ella Prescott",
    "Ivy Navarro",
    "Harper Quill",
    "Stella Bianchi",
    "Maeve Corrigan",
    "Tessa Huang",
    "Lucy Albright",
    "Rose Delaney",
    "Willa Strand",
    "Piper Lowell",
  ],
  "Boys U17": [
    "Miles Garrity",
    "Felix Andrade",
    "Jonah Pryce",
    "Leo Vasquez",
    "Eli Thornbury",
    "Gabe Lindstrom",
    "Max Okada",
    "Rory Callan",
    "Isaac Mbeki",
  ],
  "Girls Novice": [
    "Audrey Kim",
    "Naomi Feld",
    "Sadie Holloway",
    "Vera Costa",
    "June Albers",
    "Cora Blake",
    "Elise Moreau",
    "Hazel Dunn",
  ],
  "Boys Novice": ["Wyatt Fenn", "Declan Shore", "Arlo Petrov", "Hugo Lassiter"],
};

const COXES: Record<string, string> = {
  "Girls Varsity": "Priya Raman",
  "Boys Varsity": "Dani Coleman",
  "Girls U17": "Tia Morales",
  "Boys U17": "Kai Bennett",
  "Girls Novice": "Lena Hart",
  "Boys Novice": "Finn Osei",
};

interface DemoSeries {
  id: string;
  name: string;
  venue: string;
  // About how many days before today this year's running was, moved back to a Sunday.
  // Earlier years are 52 weeks apart.
  daysAgo: number;
  years: number;
}

const SERIES: DemoSeries[] = [
  { id: "millrace", name: "Head of the Millrace", venue: "millrace", daysAgo: 0, years: 3 },
  { id: "kettle", name: "Fall Classic on the Kettle", venue: "kettle", daysAgo: 14, years: 2 },
  { id: "lakeside", name: "Lakeside Head", venue: "lakeside", daysAgo: 28, years: 2 },
];

const VENUES: VenueData = {
  venues: [
    {
      id: "millrace",
      name: "Millrace River Park",
      courseLengthM: 4800,
      courseBearing: 30,
      places: [
        { label: "Launch docks", lat: 40.1912, lon: -82.9653 },
        { label: "Start", lat: 40.1895, lon: -82.9701 },
        { label: "Footbridge viewing", lat: 40.2051, lon: -82.9622 },
        { label: "Finish", lat: 40.2203, lon: -82.9548 },
        { label: "Parking and team tents", lat: 40.2189, lon: -82.9581 },
      ],
      notes:
        "Park in the north lot and walk five minutes to the tents. The footbridge is the best view: crews pass about 12 minutes after they start. Bring layers. It's windy on the water even when it's calm in the lot. Restrooms are at the boathouse and the north lot.",
    },
    {
      id: "kettle",
      name: "Kettle Lake Rowing Center",
      courseLengthM: 5000,
      courseBearing: 300,
      places: [
        { label: "Start", lat: 40.3401, lon: -83.0412 },
        { label: "Finish", lat: 40.3519, lon: -83.0906 },
        { label: "Parking", lat: 40.3532, lon: -83.0874 },
      ],
      notes: "Grass parking fills by 8 am. The finish area has food trucks.",
    },
    {
      id: "lakeside",
      name: "Lakeside Park",
      courseLengthM: 4500,
      courseBearing: 180,
      places: [
        { label: "Finish", lat: 40.1174, lon: -83.1321 },
        { label: "Parking", lat: 40.1189, lon: -83.1302 },
      ],
      notes: "",
    },
  ],
  seriesVenue: Object.fromEntries(SERIES.map((s) => [seriesKey(s.name), s.venue])),
  clubTips:
    "Our tent is the green one with the club flag. Families take turns bringing lunch: check the sign-up sheet. Rowers eat at the trailer, so pack snacks for yourself. Ask any parent in a club jacket if you're lost.",
  chatUrl: "https://example.com/riverside-parents",
};

/** Small seeded random numbers, so the demo looks the same every time. */
function random(seed: string): () => number {
  let h = 1779033703;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** 1234.5 seconds -> "20:34.500" */
function raceTime(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  return `${pad(Math.floor(ms / 60000))}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
}

/** Minutes after midnight -> "9:30:00 AM" */
function startText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${((h + 11) % 12) + 1}:${pad(minutes % 60)}:00 ${h < 12 ? "AM" : "PM"}`;
}

/** Minutes after midnight -> "09:30:20.000" */
function clockText(minutes: number): string {
  const s = Math.round(minutes * 60);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}.000`;
}

/** The date itself if it's a Sunday, or the Sunday before. Regattas race at weekends. */
function lastSunday(date: string): string {
  return addDays(date, -new Date(`${date}T12:00:00Z`).getUTCDay());
}

function localMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: club.timezone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

function clubCrew(boats: number, index: number): string {
  return boats > 1 ? `${club.name} (${"ABCDEFG"[index]})` : club.name;
}

function strokeName(full: string): string {
  const [first, ...rest] = full.split(" ");
  return `${rest.join(" ")}, ${first![0]}.`;
}

/** The club boat's lineup, bow first, rotating through the squad so boats differ. */
function crewFor(event: DemoEvent, boat: number): { seats: string[]; cox: string | null } {
  const size = boatSize(event.name);
  const pool = SQUADS[event.squad]!;
  const offset = (boat * size.rowers + EVENTS.indexOf(event)) % pool.length;
  const seats = Array.from({ length: size.rowers }, (_, i) => pool[(offset + i) % pool.length]!);
  return { seats, cox: size.cox ? COXES[event.squad]! : null };
}

interface Built {
  regatta: Regatta;
  lineups: RegattaLineups;
}

/**
 * One running of a series. Events before `nowMinutes` have results, the one racing has
 * start times only, and later ones have entries and bow numbers. Past days pass Infinity.
 */
function buildRegatta(series: DemoSeries, date: string, nowMinutes: number, first: number): Built {
  const year = date.slice(0, 4);
  const rand = random(`${series.id}-${year}`);
  const done = nowMinutes === Infinity;
  const lineups: RegattaLineups = {};
  let bow = 1;
  const results: RawEvent[] = EVENTS.map((event, i) => {
    const num = String(i + 1);
    const start = first + i * 35;
    const fieldSize = 6 + Math.floor(rand() * 6);
    const others = [...OTHER_CLUBS].sort(() => rand() - 0.5);
    // Club boats spread through the start order.
    const clubSlots = Array.from({ length: event.clubBoats }, (_, b) =>
      Math.floor(((b + 0.5) * fieldSize) / event.clubBoats),
    );
    let clubSeen = 0;
    let otherSeen = 0;
    const adjusted = new Map<RawEntry, number>();
    const entries: RawEntry[] = Array.from({ length: fieldSize }, (_, k) => {
      const entryBow = String(bow++);
      const departs = start + (k * BOAT_GAP_S) / 60;
      const isClub = clubSlots.includes(k);
      const boatIndex = isClub ? clubSeen++ : -1;
      // One club boat at the Kettle races as exhibition, to show how that looks.
      const exhibition = isClub && series.id === "kettle" && event.name === "Womens U19 4+";
      const [crew, abbrev] = isClub
        ? [exhibition ? `${club.name} - EXH` : clubCrew(event.clubBoats, boatIndex), "RRC"]
        : others[otherSeen++ % others.length]!;
      let stroke = `${SURNAMES[Math.floor(rand() * SURNAMES.length)]}, ${"ABCDEFGHJKLMNPRST"[Math.floor(rand() * 17)]}.`;
      if (isClub) {
        const { seats, cox } = crewFor(event, boatIndex);
        stroke = strokeName(seats[seats.length - 1]!);
        lineups[lineupKey(num, entryBow)] = {
          seats: seats.map((name) => ({ name, rowerId: rowerKey(name) })),
          cox: cox ? { name: cox, rowerId: rowerKey(cox) } : null,
          from: COACH,
          at: `${date}T12:00:00.000Z`,
        } satisfies Lineup;
      }
      const seconds = event.seconds * (isClub ? 0.985 : 1) * (1 + rand() * 0.09);
      const penalty = rand() < 0.06 ? 5 : 0;
      const age = 15 + Math.floor(rand() * 3);
      const finished = done || departs + seconds / 60 + FINISH_MARGIN_MIN <= nowMinutes;
      const started = done || departs <= nowMinutes;
      const entry: RawEntry = {
        Bow: entryBow,
        Crew: crew,
        CrewAbbrev: abbrev,
        Stroke: stroke,
        Place: "",
        RawTime: finished ? raceTime(seconds) : "",
        AdjTime: finished ? `${exhibition ? "Exh " : ""}${raceTime(seconds + penalty)}` : "",
        PenaltyCode: [penalty ? "buoy(5s)" : "", `Age ${age}(0)`, exhibition ? "Exhib" : ""]
          .filter(Boolean)
          .join(", "),
        ...(started && { G_Start_time_raw: clockText(departs) }),
      };
      adjusted.set(entry, seconds + penalty);
      return entry;
    });
    // Results arrive for a whole event at once, which keeps the demo simple.
    const complete = entries.every((e) => e.AdjTime !== "");
    if (!complete) for (const e of entries) Object.assign(e, { RawTime: "", AdjTime: "" });
    const placed = entries
      .filter((e) => /^\d/.test(e.AdjTime))
      .sort((a, b) => adjusted.get(a)! - adjusted.get(b)!);
    placed.forEach((e, p) => (e.Place = p + 1));
    return {
      Event: `${num} ${event.name}`,
      EventNum: num,
      RaceType: "Head",
      Start: startText(start),
      Official: done,
      entries,
    };
  });
  const regatta = normalizeRegatta(`demo-${series.id}-${year}`, {
    regattaInfo: {
      Title: `${year} ${series.name}`,
      Date: date,
      RaceType: "Head",
      ResultsPendOfficial: !done,
    },
    results,
  });
  return { regatta, lineups };
}

function weather(regatta: Regatta, today: string): Conditions {
  const rand = random(`weather-${regatta.id}`);
  const units = club.units;
  const metric = units === "metric";
  const temp = 42 + Math.round(rand() * 18);
  return {
    windSpeed: Math.round((metric ? 8 : 5) + rand() * (metric ? 20 : 12)),
    windFrom: Math.round(rand() * 360),
    tempMin: metric ? Math.round((temp - 32) / 1.8) : temp,
    tempMax: metric ? Math.round((temp + 9 - 32) / 1.8) : temp + 9,
    rain: rand() < 0.25 ? (metric ? 2 : 0.08) : 0,
    units,
    forecast: regatta.date >= today,
  };
}

/** Today's regatta, rebuilt around the current time, and its alert log. */
function raceDay(now: Date): {
  record: StoredRegatta;
  lineups: RegattaLineups;
  alerts: LoggedAlert[];
} {
  const today = localDate(now, club.timezone);
  // Starts arranged so about four events are done whenever the demo runs in the daytime.
  const nowMinutes = Math.min(Math.max(localMinutes(now), 10 * 60), 18 * 60);
  const first = Math.round((nowMinutes - 140) / 5) * 5;
  const series = SERIES[0]!;
  const built = buildRegatta(series, today, localMinutes(now), first);
  const record: StoredRegatta = {
    regatta: built.regatta,
    fetchedAt: now.toISOString(),
  };

  // The alerts the scheduled refresh would have sent, oldest first.
  let alerts: LoggedAlert[] = [];
  built.regatta.events.forEach((event, i) => {
    const start = first + i * 35;
    const blank = (e: (typeof event.entries)[number]) => ({
      ...e,
      place: null,
      status: "pending" as const,
      startedAt: null,
    });
    const before: Regatta = {
      ...built.regatta,
      events: built.regatta.events.map((ev) =>
        ev === event ? { ...ev, entries: ev.entries.map(blank) } : ev,
      ),
    };
    const startedAt = zonedInstant(today, start, club.timezone);
    const starts = startNotices(
      before,
      built.regatta,
      club,
      EMPTY_SETTINGS,
      club.timezone,
      startedAt,
    );
    const results = resultNotices(before, built.regatta, club, EMPTY_SETTINGS);
    const resultAt = new Date(startedAt.getTime() + 35 * 60_000);
    for (const [notices, at] of [
      [starts, startedAt],
      [results, resultAt],
    ] as const) {
      if (at > now) continue;
      alerts = appendAlerts(
        alerts,
        notices.map(({ eventKey, kind, title, body, url }) => ({
          eventKey,
          kind,
          title,
          body,
          url,
        })),
        at,
      );
    }
  });
  return { record, lineups: built.lineups, alerts };
}

function roster(season: string): RosterRower[] {
  const rowers = Object.entries(SQUADS).flatMap(([squad, names]) =>
    names.map((name) => ({ name, squad, role: "rower" as const })),
  );
  const coxes = Object.entries(COXES).map(([squad, name]) => ({
    name,
    squad,
    role: "cox" as const,
  }));
  return [...rowers, ...coxes].map(({ name, squad, role }) => ({
    id: rowerKey(name),
    name,
    squad,
    role,
    seasons: [season],
  }));
}

/** A memory store holding the demo club, built once per server. */
function seed(now: Date): RegattaStore {
  const store = memoryStore();
  const today = localDate(now, club.timezone);
  const season = today.slice(0, 4);
  const conditions = new Map<string, Conditions>();

  const pastRecords: StoredRegatta[] = [];
  const lineupsById = new Map<string, RegattaLineups>();
  for (const series of SERIES) {
    for (let y = 0; y < series.years; y++) {
      if (series.daysAgo === 0 && y === 0) continue;
      const date = lastSunday(addDays(today, -series.daysAgo - y * 364));
      const built = buildRegatta(series, date, Infinity, 8 * 60 + 30);
      pastRecords.push({ regatta: built.regatta, fetchedAt: `${date}T22:00:00.000Z` });
      // Lineups only for this season, which is what the roster covers.
      if (date.startsWith(season)) lineupsById.set(built.regatta.id, built.lineups);
    }
  }
  const day = raceDay(now);
  for (const record of [...pastRecords, day.record]) {
    conditions.set(
      conditionsKey(record.regatta, record.regatta.date),
      weather(record.regatta, today),
    );
  }

  const base: RegattaStore = {
    ...store,
    // Today's regatta and the alerts it sent follow the clock.
    async get(id) {
      return id === day.record.regatta.id ? raceDay(new Date()).record : store.get(id);
    },
    async list() {
      return [...(await store.list()), raceDay(new Date()).record];
    },
    async summaries() {
      return (await base.list()).map(summarize);
    },
    async getLineups(id) {
      if (id === day.record.regatta.id) {
        const saved = await store.getLineups(id);
        return Object.keys(saved).length ? saved : raceDay(new Date()).lineups;
      }
      return store.getLineups(id);
    },
    async getAlertLog() {
      const saved = await store.getAlertLog();
      return [...saved, ...raceDay(new Date()).alerts].sort((a, b) => b.at.localeCompare(a.at));
    },
    conditions: {
      async get(id) {
        const found = conditions.get(id);
        return found ? { conditions: found, fetchedAt: new Date().toISOString() } : null;
      },
      // Never look anything up.
      async put() {},
    },
  };

  void Promise.all([
    ...pastRecords.map((r) => store.put(r)),
    ...[...lineupsById].map(([id, l]) => store.putLineups(id, l)),
    store.putVenues(VENUES),
    store.putBlades(BLADES),
    store.putRoster({ rowers: roster(season) }),
    store.putAnnouncements([
      {
        id: "demo-1",
        text: "Team tent is at the north end of the parking lot. Lunch at the trailer from noon.",
        from: COACH,
        postedAt: new Date(now.getTime() - 50 * 60_000).toISOString(),
        expiresAt: new Date(now.getTime() + 6 * 3_600_000).toISOString(),
      },
    ]),
    store.putNotes(
      pastRecords.find((r) => r.regatta.id.startsWith("demo-kettle-" + season))?.regatta.id ?? "",
      {
        "": {
          text: "Windy morning and a long wait at the start. Proud of how every crew handled it.",
          from: COACH,
          at: `${addDays(today, -14)}T21:00:00.000Z`,
        },
      },
    ),
  ]);
  return base;
}

let demo: RegattaStore | null = null;

export function demoStore(): RegattaStore {
  demo ??= seed(new Date());
  return demo;
}

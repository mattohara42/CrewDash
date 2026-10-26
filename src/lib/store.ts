import { getStore } from "@netlify/blobs";
import { regattaDates, type Regatta } from "../crewtimer/normalize.js";
import { EMPTY_SETTINGS, parseSettings, type Settings } from "./settings.js";
import type { CachedConditions } from "./conditions.js";
import { parseLineups, type RegattaLineups } from "./lineups.js";
import { parseNotes, type RegattaNotes } from "./notes.js";
import type { ResultTimes } from "./speed.js";
import { parseAnnouncements, type Announcement } from "./announcements.js";
import { EMPTY_VENUES, parseVenueData, type VenueData } from "./venues.js";
import { parseAlertLog, type LoggedAlert } from "./alert-log.js";
import { EMPTY_ROSTER, parseRoster, type Roster } from "./roster.js";
import { EMPTY_BLADES, parseBladeData, type BladeData } from "./blades.js";
import { demoStore } from "../demo/seed.js";
import { isDemo } from "./config.js";

export interface RegattaLinks {
  registration?: string;
  website?: string;
}

export interface StoredRegatta {
  regatta: Regatta;
  // ISO time CrewDash last fetched this regatta from CrewTimer.
  fetchedAt: string;
  // Series name set by an admin. When missing, it's suggested from the title.
  series?: string;
  // Links an admin added: the regatta's entry page (RegattaCentral, Streamline) and website.
  links?: RegattaLinks;
  // The PARSER_VERSION that made this copy. Missing on copies made before versions existed.
  parserVersion?: number;
  // Event number -> when its results appeared. See speed.ts.
  resultTimes?: Record<string, ResultTimes>;
  // CrewTimer's change marker at the last scheduled refresh. See fetchChangeMarker.
  marker?: string;
}

// What the scheduled refresh needs to know about a stored regatta, without downloading it.
export interface RegattaSummary {
  id: string;
  // The first race day, which is the regatta's date.
  date: string;
  // Every race day.
  dates: string[];
  parserVersion: number;
}

export function summarize(record: StoredRegatta): RegattaSummary {
  return {
    id: record.regatta.id,
    date: record.regatta.date,
    dates: regattaDates(record.regatta),
    parserVersion: record.parserVersion ?? 0,
  };
}

/**
 * Brings the calendar in line with the regattas actually stored: adds any it's missing and
 * drops any no longer there. Returns the corrected calendar, or null when it was right.
 */
export async function reconcileCalendar(
  ids: string[],
  calendar: Calendar,
  load: (id: string) => Promise<StoredRegatta | null>,
): Promise<Calendar | null> {
  const missing = ids.filter((id) => !calendar[id]);
  const gone = Object.keys(calendar).filter((id) => !ids.includes(id));
  if (missing.length === 0 && gone.length === 0) return null;
  const fixed = { ...calendar };
  for (const id of gone) delete fixed[id];
  for (const id of missing) {
    const record = await load(id);
    if (record) fixed[id] = summarize(record);
  }
  return fixed;
}

type Calendar = Record<string, RegattaSummary>;

// Reads and writes the calendar with its etag, so a write only lands if nobody else wrote it
// since it was read. write() returns false when someone did.
export interface CalendarIO {
  read(): Promise<{ calendar: Calendar; etag: string | null }>;
  write(calendar: Calendar, etag: string | null): Promise<boolean>;
}

const CALENDAR_TRIES = 5;

/**
 * Changes the calendar without losing another writer's change: if the calendar moved since
 * it was read, it's read again and the change made again. change() returns null for no write.
 */
export async function changeCalendar(
  io: CalendarIO,
  change: (calendar: Calendar) => Promise<Calendar | null> | Calendar | null,
): Promise<Calendar> {
  for (let attempt = 1; ; attempt++) {
    const { calendar, etag } = await io.read();
    const next = await change(calendar);
    if (!next) return calendar;
    if (await io.write(next, etag)) return next;
    if (attempt >= CALENDAR_TRIES) throw new Error("The regatta calendar kept changing.");
  }
}

export interface RegattaStore {
  get(id: string): Promise<StoredRegatta | null>;
  put(record: StoredRegatta): Promise<void>;
  list(): Promise<StoredRegatta[]>;
  // One summary per stored regatta, from a small index rather than every regatta.
  summaries(): Promise<RegattaSummary[]>;
  // The club's settings as an admin saved them (club.json's shape), or null if never saved.
  // Checked with parseClubConfig when read. See club-settings.ts.
  getClub(): Promise<unknown>;
  putClub(value: unknown): Promise<void>;
  getSettings(): Promise<Settings>;
  putSettings(settings: Settings): Promise<void>;
  getVenues(): Promise<VenueData>;
  putVenues(data: VenueData): Promise<void>;
  // Other clubs' blades, entered by the admin. See blades.ts.
  getBlades(): Promise<BladeData>;
  putBlades(data: BladeData): Promise<void>;
  getAnnouncements(): Promise<Announcement[]>;
  putAnnouncements(list: Announcement[]): Promise<void>;
  getNotes(regattaId: string): Promise<RegattaNotes>;
  putNotes(regattaId: string, notes: RegattaNotes): Promise<void>;
  getLineups(regattaId: string): Promise<RegattaLineups>;
  putLineups(regattaId: string, lineups: RegattaLineups): Promise<void>;
  // The club's rowers across seasons. See roster.ts.
  getRoster(): Promise<Roster>;
  putRoster(roster: Roster): Promise<void>;
  // What alerts and announcements went out recently. See alert-log.ts.
  getAlertLog(): Promise<LoggedAlert[]>;
  putAlertLog(log: LoggedAlert[]): Promise<void>;
  // Weather per regatta, so Open-Meteo is asked once rather than on every page view.
  conditions: {
    get(id: string): Promise<CachedConditions | null>;
    put(id: string, value: CachedConditions): Promise<void>;
  };
}

const PREFIX = "regatta/";
const SETTINGS_KEY = "settings";
const VENUES_KEY = "venues";
const BLADES_KEY = "blades";
const ANNOUNCEMENTS_KEY = "announcements";
const ALERTS_KEY = "alerts";
const ROSTER_KEY = "roster";
const CALENDAR_KEY = "calendar";
const CLUB_KEY = "club";

/**
 * Netlify Blobs store. Shared by every deploy of the site, previews included. With
 * CREWDASH_DEMO=1 it's the made-up demo club instead (see src/demo/seed.ts).
 */
export function blobsStore(): RegattaStore {
  if (isDemo()) return demoStore();
  const store = getStore({ name: "regattas", consistency: "strong" });
  const calendarIO: CalendarIO = {
    async read() {
      const found = await store.getWithMetadata(CALENDAR_KEY, { type: "json" });
      return { calendar: (found?.data ?? {}) as Calendar, etag: found?.etag ?? null };
    },
    async write(calendar, etag) {
      const { modified } = await store.setJSON(
        CALENDAR_KEY,
        calendar,
        etag ? { onlyIfMatch: etag } : { onlyIfNew: true },
      );
      return modified;
    },
  };
  return {
    async get(id) {
      return (await store.get(PREFIX + id, { type: "json" })) as StoredRegatta | null;
    },
    async put(record) {
      await store.setJSON(PREFIX + record.regatta.id, record);
      // Keep the calendar in step. If this fails, summaries() adds a regatta it's missing the
      // next time it reads, so a failure is only logged.
      try {
        await changeCalendar(calendarIO, (calendar) => ({
          ...calendar,
          [record.regatta.id]: summarize(record),
        }));
      } catch (err) {
        console.error("Updating the regatta calendar failed:", err);
      }
    },
    // The calendar is checked against the stored keys on every read, so a regatta stored
    // before the calendar existed, or whose calendar update failed, is picked up here.
    async summaries() {
      const { blobs } = await store.list({ prefix: PREFIX });
      const ids = blobs.map((b) => b.key.slice(PREFIX.length));
      const calendar = await changeCalendar(calendarIO, (current) =>
        reconcileCalendar(
          ids,
          current,
          async (id) => (await store.get(PREFIX + id, { type: "json" })) as StoredRegatta | null,
        ),
      );
      return ids.flatMap((id) => calendar[id] ?? []);
    },
    async list() {
      const { blobs } = await store.list({ prefix: PREFIX });
      const records = await Promise.all(
        blobs.map((b) => store.get(b.key, { type: "json" }) as Promise<StoredRegatta | null>),
      );
      return records.filter((r): r is StoredRegatta => r !== null);
    },
    async getClub() {
      return await store.get(CLUB_KEY, { type: "json" });
    },
    // One admin edits these, rarely, so last write wins is fine.
    async putClub(value) {
      await store.setJSON(CLUB_KEY, value);
    },
    async getSettings() {
      return parseSettings(await store.get(SETTINGS_KEY, { type: "json" }));
    },
    // Admin edits are rare and made by one person at a time, so last write wins is fine.
    async putSettings(settings) {
      await store.setJSON(SETTINGS_KEY, settings);
    },
    async getVenues() {
      return parseVenueData(await store.get(VENUES_KEY, { type: "json" }));
    },
    async putVenues(data) {
      await store.setJSON(VENUES_KEY, data);
    },
    async getBlades() {
      return parseBladeData(await store.get(BLADES_KEY, { type: "json" }));
    },
    async putBlades(data) {
      await store.setJSON(BLADES_KEY, data);
    },
    async getAnnouncements() {
      return parseAnnouncements(await store.get(ANNOUNCEMENTS_KEY, { type: "json" }));
    },
    async putAnnouncements(list) {
      await store.setJSON(ANNOUNCEMENTS_KEY, list);
    },
    async getNotes(id) {
      return parseNotes(await store.get(`notes/${id}`, { type: "json" }));
    },
    async putNotes(id, notes) {
      await store.setJSON(`notes/${id}`, notes);
    },
    async getLineups(id) {
      return parseLineups(await store.get(`lineups/${id}`, { type: "json" }));
    },
    async putLineups(id, lineups) {
      await store.setJSON(`lineups/${id}`, lineups);
    },
    async getRoster() {
      return parseRoster(await store.get(ROSTER_KEY, { type: "json" }));
    },
    // Coaches edit it, mostly one at a time, so last write wins is fine.
    async putRoster(roster) {
      await store.setJSON(ROSTER_KEY, roster);
    },
    async getAlertLog() {
      return parseAlertLog(await store.get(ALERTS_KEY, { type: "json" }));
    },
    // Written by the scheduled refresh, an admin's Refresh now and coach announcements.
    // They rarely overlap, so last write wins is fine.
    async putAlertLog(log) {
      await store.setJSON(ALERTS_KEY, log);
    },
    conditions: {
      async get(id) {
        return (await store.get(`conditions/${id}`, { type: "json" })) as CachedConditions | null;
      },
      async put(id, value) {
        await store.setJSON(`conditions/${id}`, value);
      },
    },
  };
}

/** In-memory store for tests. */
export function memoryStore(): RegattaStore {
  const records = new Map<string, StoredRegatta>();
  let settings: Settings = EMPTY_SETTINGS;
  let venues: VenueData = EMPTY_VENUES;
  let blades: BladeData = EMPTY_BLADES;
  let announcements: Announcement[] = [];
  const conditions = new Map<string, CachedConditions>();
  const notes = new Map<string, RegattaNotes>();
  const lineups = new Map<string, RegattaLineups>();
  let alertLog: LoggedAlert[] = [];
  let roster: Roster = EMPTY_ROSTER;
  let club: unknown = null;
  return {
    async get(id) {
      return records.get(id) ?? null;
    },
    async put(record) {
      records.set(record.regatta.id, record);
    },
    async list() {
      return [...records.values()];
    },
    async summaries() {
      return [...records.values()].map(summarize);
    },
    async getClub() {
      return club;
    },
    async putClub(next) {
      club = next;
    },
    async getSettings() {
      return settings;
    },
    async putSettings(next) {
      settings = next;
    },
    async getVenues() {
      return venues;
    },
    async putVenues(next) {
      venues = next;
    },
    async getBlades() {
      return blades;
    },
    async putBlades(next) {
      blades = next;
    },
    async getAnnouncements() {
      return announcements;
    },
    async putAnnouncements(next) {
      announcements = next;
    },
    async getNotes(id) {
      return notes.get(id) ?? {};
    },
    async putNotes(id, next) {
      notes.set(id, next);
    },
    async getLineups(id) {
      return lineups.get(id) ?? {};
    },
    async putLineups(id, next) {
      lineups.set(id, next);
    },
    async getRoster() {
      return roster;
    },
    async putRoster(next) {
      roster = next;
    },
    async getAlertLog() {
      return alertLog;
    },
    async putAlertLog(next) {
      alertLog = next;
    },
    conditions: {
      async get(id) {
        return conditions.get(id) ?? null;
      },
      async put(id, value) {
        conditions.set(id, value);
      },
    },
  };
}

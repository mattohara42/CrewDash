import { getStore } from "@netlify/blobs";
import type { Regatta } from "../crewtimer/normalize.js";
import { EMPTY_SETTINGS, parseSettings, type Settings } from "./settings.js";
import type { CachedConditions } from "./conditions.js";
import { parseNotes, type RegattaNotes } from "./notes.js";
import type { ResultTimes } from "./speed.js";
import { parseAnnouncements, type Announcement } from "./announcements.js";
import { EMPTY_VENUES, parseVenueData, type VenueData } from "./venues.js";

export interface StoredRegatta {
  regatta: Regatta;
  // ISO time CrewDash last fetched this regatta from CrewTimer.
  fetchedAt: string;
  // Series name set by an admin. When missing, it's suggested from the title.
  series?: string;
  // Event number -> when its results appeared. See speed.ts.
  resultTimes?: Record<string, ResultTimes>;
}

export interface RegattaStore {
  get(id: string): Promise<StoredRegatta | null>;
  put(record: StoredRegatta): Promise<void>;
  list(): Promise<StoredRegatta[]>;
  getSettings(): Promise<Settings>;
  putSettings(settings: Settings): Promise<void>;
  getVenues(): Promise<VenueData>;
  putVenues(data: VenueData): Promise<void>;
  getAnnouncements(): Promise<Announcement[]>;
  putAnnouncements(list: Announcement[]): Promise<void>;
  getNotes(regattaId: string): Promise<RegattaNotes>;
  putNotes(regattaId: string, notes: RegattaNotes): Promise<void>;
  // Weather per regatta, so Open-Meteo is asked once rather than on every page view.
  conditions: {
    get(id: string): Promise<CachedConditions | null>;
    put(id: string, value: CachedConditions): Promise<void>;
  };
}

const PREFIX = "regatta/";
const SETTINGS_KEY = "settings";
const VENUES_KEY = "venues";
const ANNOUNCEMENTS_KEY = "announcements";

/** Netlify Blobs store. Shared by every deploy of the site, previews included. */
export function blobsStore(): RegattaStore {
  const store = getStore({ name: "regattas", consistency: "strong" });
  return {
    async get(id) {
      return (await store.get(PREFIX + id, { type: "json" })) as StoredRegatta | null;
    },
    async put(record) {
      await store.setJSON(PREFIX + record.regatta.id, record);
    },
    async list() {
      const { blobs } = await store.list({ prefix: PREFIX });
      const records = await Promise.all(
        blobs.map((b) => store.get(b.key, { type: "json" }) as Promise<StoredRegatta | null>),
      );
      return records.filter((r): r is StoredRegatta => r !== null);
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
  let announcements: Announcement[] = [];
  const conditions = new Map<string, CachedConditions>();
  const notes = new Map<string, RegattaNotes>();
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

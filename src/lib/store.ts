import { getStore } from "@netlify/blobs";
import type { Regatta } from "../crewtimer/normalize.js";
import { EMPTY_SETTINGS, parseSettings, type Settings } from "./settings.js";
import { EMPTY_VENUES, parseVenueData, type VenueData } from "./venues.js";

export interface StoredRegatta {
  regatta: Regatta;
  // ISO time CrewDash last fetched this regatta from CrewTimer.
  fetchedAt: string;
  // Series name set by an admin. When missing, it's suggested from the title.
  series?: string;
}

export interface RegattaStore {
  get(id: string): Promise<StoredRegatta | null>;
  put(record: StoredRegatta): Promise<void>;
  list(): Promise<StoredRegatta[]>;
  getSettings(): Promise<Settings>;
  putSettings(settings: Settings): Promise<void>;
  getVenues(): Promise<VenueData>;
  putVenues(data: VenueData): Promise<void>;
}

const PREFIX = "regatta/";
const SETTINGS_KEY = "settings";
const VENUES_KEY = "venues";

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
  };
}

/** In-memory store for tests. */
export function memoryStore(): RegattaStore {
  const records = new Map<string, StoredRegatta>();
  let settings: Settings = EMPTY_SETTINGS;
  let venues: VenueData = EMPTY_VENUES;
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
  };
}

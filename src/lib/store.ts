import { getStore } from "@netlify/blobs";
import type { Regatta } from "../crewtimer/normalize.js";

export interface StoredRegatta {
  regatta: Regatta;
  // ISO time CrewDash last fetched this regatta from CrewTimer.
  fetchedAt: string;
}

export interface RegattaStore {
  get(id: string): Promise<StoredRegatta | null>;
  put(record: StoredRegatta): Promise<void>;
  list(): Promise<StoredRegatta[]>;
}

const PREFIX = "regatta/";

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
  };
}

/** In-memory store for tests. */
export function memoryStore(): RegattaStore {
  const records = new Map<string, StoredRegatta>();
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
  };
}

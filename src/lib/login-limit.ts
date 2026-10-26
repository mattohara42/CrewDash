import { createHash } from "node:crypto";
import { clubStore } from "./blobs.js";

// Slows down password guessing: after too many failed logins from one address, that
// address waits. Addresses are stored only as a salted hash. Functions don't share memory,
// so the counts live in Netlify Blobs.

export const MAX_FAILURES = 10;
export const WINDOW_MS = 15 * 60_000;

interface Failures {
  count: number;
  // When the first failure in this window happened.
  since: number;
}

export interface FailureStore {
  get(key: string): Promise<Failures | null>;
  set(key: string, value: Failures): Promise<void>;
  delete(key: string): Promise<void>;
}

export function blobsFailureStore(): FailureStore {
  const store = clubStore("logins");
  return {
    async get(key) {
      return (await store.get(key, { type: "json" })) as Failures | null;
    },
    async set(key, value) {
      await store.setJSON(key, value);
    },
    async delete(key) {
      await store.delete(key);
    },
  };
}

export function memoryFailureStore(): FailureStore {
  const map = new Map<string, Failures>();
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
  };
}

/** A key for an address that doesn't reveal it. */
export function failureKey(address: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${address}`).digest("hex").slice(0, 32);
}

function current(record: Failures | null, now: number): Failures | null {
  return record && now - record.since < WINDOW_MS ? record : null;
}

/** True when this address has failed too often lately and should wait. */
export async function isLockedOut(
  store: FailureStore,
  key: string,
  now: number = Date.now(),
): Promise<boolean> {
  return (current(await store.get(key), now)?.count ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(
  store: FailureStore,
  key: string,
  now: number = Date.now(),
): Promise<void> {
  const record = current(await store.get(key), now);
  await store.set(key, record ? { ...record, count: record.count + 1 } : { count: 1, since: now });
}

export async function clearFailures(store: FailureStore, key: string): Promise<void> {
  await store.delete(key);
}

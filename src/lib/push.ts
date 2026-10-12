import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { normalizeName } from "../club.js";
import type { ResultNotice } from "./notify.js";

// Web push subscriptions and the keys that sign notifications. The keys are
// generated on first use and kept in Netlify Blobs, so there's nothing to set
// up in the Netlify dashboard.

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export interface Follow {
  // Every club result, or only the listed events (by event key).
  all: boolean;
  events: string[];
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface StoredSubscription {
  subscription: PushSubscriptionData;
  follow: Follow;
  createdAt: string;
}

export interface PushStore {
  getKeys(): Promise<VapidKeys | null>;
  // Saves the keys unless some already exist, and returns whichever are stored.
  createKeys(keys: VapidKeys): Promise<VapidKeys>;
  get(endpoint: string): Promise<StoredSubscription | null>;
  put(sub: StoredSubscription): Promise<void>;
  delete(endpoint: string): Promise<void>;
  list(): Promise<StoredSubscription[]>;
}

const KEYS = "vapid-keys";
const SUBS = "subscriptions/";

function subKey(endpoint: string): string {
  return SUBS + createHash("sha256").update(endpoint).digest("hex");
}

export function blobsPushStore(): PushStore {
  const store = getStore({ name: "push", consistency: "strong" });
  return {
    async getKeys() {
      return (await store.get(KEYS, { type: "json" })) as VapidKeys | null;
    },
    async createKeys(keys) {
      const { modified } = await store.setJSON(KEYS, keys, { onlyIfNew: true });
      return modified ? keys : ((await store.get(KEYS, { type: "json" })) as VapidKeys);
    },
    async get(endpoint) {
      return (await store.get(subKey(endpoint), { type: "json" })) as StoredSubscription | null;
    },
    async put(sub) {
      await store.setJSON(subKey(sub.subscription.endpoint), sub);
    },
    async delete(endpoint) {
      await store.delete(subKey(endpoint));
    },
    async list() {
      const { blobs } = await store.list({ prefix: SUBS });
      const subs = await Promise.all(
        blobs.map((b) => store.get(b.key, { type: "json" }) as Promise<StoredSubscription | null>),
      );
      return subs.filter((s): s is StoredSubscription => s !== null);
    },
  };
}

export function memoryPushStore(): PushStore {
  let keys: VapidKeys | null = null;
  const subs = new Map<string, StoredSubscription>();
  return {
    async getKeys() {
      return keys;
    },
    async createKeys(next) {
      keys ??= next;
      return keys;
    },
    async get(endpoint) {
      return subs.get(endpoint) ?? null;
    },
    async put(sub) {
      subs.set(sub.subscription.endpoint, sub);
    },
    async delete(endpoint) {
      subs.delete(endpoint);
    },
    async list() {
      return [...subs.values()];
    },
  };
}

export async function vapidKeys(store: PushStore, generate: () => VapidKeys): Promise<VapidKeys> {
  return (await store.getKeys()) ?? store.createKeys(generate());
}

// Browsers' push services. The server POSTs to whatever endpoint a browser
// hands it, so anything else is refused rather than letting a crafted
// subscription point the server at an arbitrary address.
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  // Chromium builds use Google hosts such as jmt17.google.com.
  "google.com",
  "updates.push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

function isPushHost(host: string): boolean {
  return PUSH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

const MAX_FOLLOWED_EVENTS = 100;

/** Validates a subscription posted by the browser. Returns null if it's unusable. */
export function parseSubscription(value: unknown): PushSubscriptionData | null {
  const v = value as Partial<PushSubscriptionData> | null;
  if (!v || typeof v.endpoint !== "string" || !v.keys) return null;
  const { p256dh, auth } = v.keys;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  let url: URL;
  try {
    url = new URL(v.endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !isPushHost(url.hostname)) return null;
  return { endpoint: v.endpoint, keys: { p256dh, auth } };
}

export function parseFollow(value: unknown): Follow {
  const v = (value ?? {}) as Partial<Follow>;
  const events = Array.isArray(v.events)
    ? [...new Set(v.events.filter((e): e is string => typeof e === "string").map(normalizeName))]
    : [];
  return { all: v.all === true, events: events.filter(Boolean).slice(0, MAX_FOLLOWED_EVENTS) };
}

export function wants(follow: Follow, eventKey: string): boolean {
  return follow.all || follow.events.includes(eventKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  // Lets a later update replace the earlier notification for the same event.
  tag: string;
}

/** Sends one push. Rejects with an error carrying `statusCode` when the push service refuses. */
export type PushSender = (
  subscription: PushSubscriptionData,
  payload: PushPayload,
) => Promise<void>;

/** Sends each notice to the subscribers who follow its event, and drops expired subscriptions. */
export async function sendNotices(
  notices: ResultNotice[],
  store: PushStore,
  send: PushSender,
): Promise<{ sent: number; removed: number }> {
  if (notices.length === 0) return { sent: 0, removed: 0 };
  const subs = await store.list();
  let sent = 0;
  const expired = new Set<string>();

  await Promise.all(
    subs.map(async (sub) => {
      for (const notice of notices) {
        if (!wants(sub.follow, notice.eventKey) || expired.has(sub.subscription.endpoint)) continue;
        try {
          await send(sub.subscription, {
            title: notice.title,
            body: notice.body,
            url: notice.url,
            tag: `${notice.regattaId}:${notice.eventKey}`,
          });
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            expired.add(sub.subscription.endpoint);
          } else {
            console.error("Push failed:", status ?? err);
          }
        }
      }
    }),
  );

  await Promise.all([...expired].map((endpoint) => store.delete(endpoint)));
  return { sent, removed: expired.size };
}

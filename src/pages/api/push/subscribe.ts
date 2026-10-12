import type { APIRoute } from "astro";
import { json, readJson } from "../../../lib/json-route.js";
import { blobsPushStore, parseFollow, parseSubscription } from "../../../lib/push.js";

// Saves this browser's push subscription and what it follows. Members only (see middleware).
export const POST: APIRoute = async ({ request }) => {
  const body = (await readJson(request)) as { subscription?: unknown; follow?: unknown } | null;
  const subscription = parseSubscription(body?.subscription);
  if (!subscription) return json({ error: "That isn't a usable push subscription." }, 400);
  const follow = parseFollow(body?.follow);
  if (!follow.all && follow.events.length === 0) {
    return json({ error: "Choose all results or at least one event." }, 400);
  }
  const store = blobsPushStore();
  const existing = await store.get(subscription.endpoint);
  await store.put({
    subscription,
    follow,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
  return json({ follow });
};

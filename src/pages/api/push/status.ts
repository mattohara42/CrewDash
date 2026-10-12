import type { APIRoute } from "astro";
import { json, readJson } from "../../../lib/json-route.js";
import { blobsPushStore } from "../../../lib/push.js";

// What this browser currently follows, so the page can show it. Members only.
export const POST: APIRoute = async ({ request }) => {
  const body = (await readJson(request)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return json({ follow: null });
  const sub = await blobsPushStore().get(body.endpoint);
  return json({ follow: sub?.follow ?? null });
};

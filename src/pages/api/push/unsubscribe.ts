import type { APIRoute } from "astro";
import { json, readJson } from "../../../lib/json-route.js";
import { blobsPushStore } from "../../../lib/push.js";

// Forgets this browser's subscription. Members only.
export const POST: APIRoute = async ({ request }) => {
  const body = (await readJson(request)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint === "string") await blobsPushStore().delete(body.endpoint);
  return json({ ok: true });
};

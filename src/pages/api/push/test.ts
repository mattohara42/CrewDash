import type { APIRoute } from "astro";
import { json, readJson } from "../../../lib/json-route.js";
import { webPushSender } from "../../../lib/notify-run.js";
import { blobsPushStore } from "../../../lib/push.js";

// Sends a test notification to this browser, so people can check alerts work. Members only.
export const POST: APIRoute = async ({ request }) => {
  const body = (await readJson(request)) as { endpoint?: unknown } | null;
  const store = blobsPushStore();
  const sub = typeof body?.endpoint === "string" ? await store.get(body.endpoint) : null;
  if (!sub) return json({ error: "Turn on alerts first." }, 404);
  try {
    const send = await webPushSender(store);
    await send(sub.subscription, {
      title: "CrewDash",
      body: "Alerts are working. You'll hear when our crews start and finish.",
      url: "/",
      // A fresh tag each time. A repeated tag replaces the last test without alerting.
      tag: `test:${Date.now()}`,
    });
  } catch (err) {
    console.error("Test push failed:", err);
    return json({ error: "The push service didn't accept the test notification." }, 502);
  }
  return json({ ok: true });
};

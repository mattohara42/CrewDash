import type { Config } from "@netlify/functions";
import { notifyFetched } from "../../src/lib/notify-run.js";
import { refreshRecent } from "../../src/lib/refresh.js";
import { blobsStore } from "../../src/lib/store.js";

// Re-fetches regattas from the day before race day until a few days after,
// so new and corrected results reach CrewDash, then notifies followers.
export default async () => {
  const store = blobsStore();
  const fetched = await refreshRecent(store);
  console.log(`Refreshed ${fetched.length} regattas`);
  try {
    const { sent, removed } = await notifyFetched(fetched, store);
    console.log(`Sent ${sent} notifications, removed ${removed} expired subscriptions`);
  } catch (err) {
    console.error("Notifying followers failed:", err);
  }
};

export const config: Config = {
  // Every 5 minutes. Most runs find no recent regattas and do no fetches.
  schedule: "*/5 * * * *",
};

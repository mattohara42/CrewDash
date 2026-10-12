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
  // Every 5 minutes on race weekends (Friday to Monday), 12:00 to 21:55 UTC.
  // That's 8 am to 6 pm US Eastern in summer and 7 am to 5 pm in winter, about
  // 120 runs a race day and none on other days, to save Netlify credits. On other
  // days an admin can tap "Refresh now".
  schedule: "*/5 12-21 * * 0,1,5,6",
};

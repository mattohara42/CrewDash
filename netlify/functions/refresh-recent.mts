import type { Config } from "@netlify/functions";
import { notifyFetched } from "../../src/lib/notify-run.js";
import { refreshRecent, warmConditions } from "../../src/lib/refresh.js";
import { blobsStore } from "../../src/lib/store.js";
import { isDemo } from "../../src/lib/config.js";

// Re-fetches regattas from the day before race day until a few days after,
// so new and corrected results reach CrewDash, then notifies followers.
export default async () => {
  // The demo's results are made up and never fetched.
  if (isDemo()) return;
  const store = blobsStore();
  const fetched = await refreshRecent(store);
  console.log(`Refreshed ${fetched.length} regattas`);
  try {
    const { sent, removed } = await notifyFetched(fetched, store);
    console.log(`Sent ${sent} notifications, removed ${removed} expired subscriptions`);
  } catch (err) {
    console.error("Notifying followers failed:", err);
  }
  try {
    console.log(`Weather warmed for ${await warmConditions(store)} race days`);
  } catch (err) {
    console.error("Warming the weather failed:", err);
  }
};

export const config: Config = {
  // Every 5 minutes on race weekends (Friday to Monday), 12:00 to 21:55 UTC.
  // That's 8 am to 6 pm US Eastern in summer and 7 am to 5 pm in winter, about
  // 120 runs a race day and none on other days, to save Netlify credits. On other
  // days an admin can tap "Refresh now". Off race day itself, each regatta is only fetched
  // once an hour (see refresh.ts).
  schedule: "*/5 12-21 * * 0,1,5,6",
};

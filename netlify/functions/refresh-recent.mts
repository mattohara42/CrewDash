import type { Config } from "@netlify/functions";
import { notifyFetched } from "../../src/lib/notify-run.js";
import { isRefreshHour, refreshRecent, warmConditions } from "../../src/lib/refresh.js";
import { blobsStore } from "../../src/lib/store.js";
import { club, isDemo } from "../../src/lib/config.js";

// Re-fetches regattas from the day before race day until a few days after,
// so new and corrected results reach CrewDash, then notifies followers.
export default async () => {
  // The demo's results are made up and never fetched.
  if (isDemo()) return;
  // Overnight in the club's time zone there's nothing to do, so the run ends before any reads.
  if (!isRefreshHour(club.timezone)) return;
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
  // Every 5 minutes, every day. Clubs race in every time zone and on any day of the week, so
  // the schedule can't know when racing is. Each run checks the club's local hours first,
  // then reads one small index of race dates (see summaries() in store.ts), and only fetches
  // regattas from the day before race day until a few days after. Off race day itself, each
  // regatta is only fetched once an hour (see refresh.ts).
  schedule: "*/5 * * * *",
};

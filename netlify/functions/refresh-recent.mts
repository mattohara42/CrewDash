import type { Config } from "@netlify/functions";
import { refreshRecent } from "../../src/lib/refresh.js";
import { blobsStore } from "../../src/lib/store.js";

// Re-fetches regattas from the day before race day until a few days after,
// so results corrected after racing still reach CrewDash.
export default async () => {
  const refreshed = await refreshRecent(blobsStore());
  console.log(`Refreshed ${refreshed.length} regattas: ${refreshed.join(", ")}`);
};

export const config: Config = {
  // Every 15 minutes, all day. Most runs find nothing recent and do no fetches.
  schedule: "*/15 * * * *",
};

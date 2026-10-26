import clubJson from "../../club.json" with { type: "json" };
import demoClubJson from "../demo/club.json" with { type: "json" };
import { parseClubConfig } from "../club.js";

/**
 * True on the demo (npm run demo, or a site with CREWDASH_DEMO=1): a made-up club with
 * public passwords, read-only, that never fetches real results. See src/demo/seed.ts.
 */
export function isDemo(): boolean {
  return process.env.CREWDASH_DEMO === "1";
}

// The demo swaps in a made-up club.
export const club = parseClubConfig(isDemo() ? demoClubJson : clubJson);

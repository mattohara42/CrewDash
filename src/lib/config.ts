import clubJson from "../../club.json" with { type: "json" };
import demoClubJson from "../demo/club.json" with { type: "json" };
import { parseClubConfig, type ClubConfig } from "../club.js";

/**
 * True on the demo (npm run demo, or a site with CREWDASH_DEMO=1): a made-up club with
 * public passwords, read-only, that never fetches real results. See src/demo/seed.ts.
 */
export function isDemo(): boolean {
  return process.env.CREWDASH_DEMO === "1";
}

/** The starting settings from club.json, or the made-up club on the demo. A bad file fails the build. */
export function clubFromFile(): ClubConfig {
  try {
    return parseClubConfig(isDemo() ? demoClubJson : clubJson);
  } catch (err) {
    throw new Error(`club.json: ${(err as Error).message}`, { cause: err });
  }
}

/**
 * The club's settings. They start from club.json. Once an admin saves settings at
 * /admin/club, loadClub() in club-settings.ts (run by the middleware on every request and by
 * the scheduled refresh) updates this object in place, so every module that imports it sees
 * the saved settings.
 */
export const club: ClubConfig = clubFromFile();

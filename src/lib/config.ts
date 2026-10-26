import clubJson from "../../club.json" with { type: "json" };
import demoClubJson from "../demo/club.json" with { type: "json" };
import { parseClubConfig } from "../club.js";

// The demo (npm run demo) swaps in a made-up club.
export const club = parseClubConfig(process.env.CREWDASH_DEMO === "1" ? demoClubJson : clubJson);

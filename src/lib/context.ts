import { club } from "./config.js";
import { effectiveClub } from "./settings.js";
import { blobsStore, type RegattaStore } from "./store.js";

/** Everything a page needs: stored regattas, admin settings and the club with its extra aliases. */
export async function loadContext(store: RegattaStore = blobsStore()) {
  const [records, settings] = await Promise.all([store.list(), store.getSettings()]);
  return { store, records, settings, club: effectiveClub(club, settings) };
}

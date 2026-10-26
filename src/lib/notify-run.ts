import webpush from "web-push";
import { club as baseClub } from "./config.js";
import { appendAlerts, noticeAlerts } from "./alert-log.js";
import { resultNotices, startNotices } from "./notify.js";
import { blobsPushStore, sendNotices, vapidKeys, type PushSender, type PushStore } from "./push.js";
import { fetchAndStore, type Fetched } from "./refresh.js";
import { effectiveClub } from "./settings.js";
import type { RegattaStore } from "./store.js";

/** Signs pushes with the site's keys. The subject tells push services who is sending. */
export async function webPushSender(store: PushStore): Promise<PushSender> {
  const keys = await vapidKeys(store, () => webpush.generateVAPIDKeys());
  const subject = process.env.URL ?? "https://crewdash.netlify.app";
  return async (subscription, payload) => {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 6 * 60 * 60,
      vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey },
    });
  };
}

/** Notifies followers about results that finished or changed in these fetches. */
export async function notifyFetched(
  fetched: Fetched[],
  regattas: RegattaStore,
  pushStore: PushStore = blobsPushStore(),
): Promise<{ sent: number; removed: number }> {
  if (fetched.length === 0) return { sent: 0, removed: 0 };
  const settings = await regattas.getSettings();
  const club = effectiveClub(baseClub, settings);
  const now = new Date();
  const notices = fetched.flatMap(({ previous, record }) => [
    ...startNotices(previous?.regatta ?? null, record.regatta, club, settings, club.timezone, now),
    ...resultNotices(previous?.regatta ?? null, record.regatta, club, settings),
  ]);
  if (notices.length === 0) return { sent: 0, removed: 0 };
  // Logged whether or not anyone subscribed, so the bell shows them. A logging failure
  // mustn't stop the alerts going out.
  try {
    await regattas.putAlertLog(appendAlerts(await regattas.getAlertLog(), noticeAlerts(notices)));
  } catch (err) {
    console.error("Logging alerts failed:", err);
  }
  return sendNotices(notices, pushStore, await webPushSender(pushStore));
}

/** Fetches one regatta now, as an admin or coach asked, and notifies followers like the
 * scheduled refresh does. The regatta is saved first, so a notification failure is only logged. */
export async function refreshAndNotify(id: string, store: RegattaStore): Promise<void> {
  const fetched = await fetchAndStore(id, store);
  try {
    await notifyFetched([fetched], store);
  } catch (err) {
    console.error("Notifying followers failed:", err);
  }
}

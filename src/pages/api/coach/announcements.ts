import type { APIRoute } from "astro";
import { backTo, withError } from "../../../lib/admin-redirect.js";
import { appendAlerts } from "../../../lib/alert-log.js";
import { post, remove } from "../../../lib/announcements.js";
import { webPushSender } from "../../../lib/notify-run.js";
import { blobsPushStore, broadcast } from "../../../lib/push.js";
import { blobsStore } from "../../../lib/store.js";

const BACK = "/coach";

// Posts or removes an announcement. Coaches and admins only (see middleware).
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const back = backTo(form.get("back"), BACK);
  const store = blobsStore();
  const list = await store.getAnnouncements();

  if (form.get("action") === "remove") {
    await store.putAnnouncements(remove(list, String(form.get("id") ?? "")));
    return redirect(back, 303);
  }

  const result = post(list, {
    text: String(form.get("text") ?? ""),
    from: locals.role === "admin" ? "admin" : "coach",
    hours: Number(form.get("hours")),
  });
  if (!result) return redirect(withError(back, "Write a message first."), 303);
  await store.putAnnouncements(result.list);
  try {
    const log = await store.getAlertLog();
    await store.putAlertLog(
      appendAlerts(log, [
        {
          kind: "announcement",
          title: "Club announcement",
          body: result.announcement.text,
          url: "/",
        },
      ]),
    );
  } catch (err) {
    console.error("Logging the announcement failed:", err);
  }

  if (form.get("push") === "on") {
    try {
      const pushStore = blobsPushStore();
      await broadcast(
        {
          title: "Club announcement",
          body: result.announcement.text,
          url: "/",
          tag: `announcement:${result.announcement.id}`,
        },
        pushStore,
        await webPushSender(pushStore),
      );
    } catch (err) {
      console.error("Announcement push failed:", err);
      return redirect(withError(back, "Posted, but the notification couldn't be sent."), 303);
    }
  }
  return redirect(back, 303);
};

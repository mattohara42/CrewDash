import type { APIRoute } from "astro";
import { normalizeName } from "../../../club.js";
import { backTo, withError } from "../../../lib/admin-redirect.js";
import { mergeEvent, unmergeEvent } from "../../../lib/settings.js";
import { blobsStore } from "../../../lib/store.js";

// Groups a renamed event with another across years, or undoes that. Admin only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const back = backTo(form.get("back"));
  const from = String(form.get("from") ?? "").trim();
  const into = String(form.get("into") ?? "").trim();
  const store = blobsStore();
  const settings = await store.getSettings();

  if (form.get("action") === "remove") {
    await store.putSettings(unmergeEvent(settings, from));
  } else if (!from || !into || normalizeName(from) === normalizeName(into)) {
    return redirect(withError(back, "Pick two different events to group together."), 303);
  } else {
    await store.putSettings(mergeEvent(settings, from, into));
  }
  return redirect(back, 303);
};

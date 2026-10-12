import type { APIRoute } from "astro";
import { backTo } from "../../../lib/admin-redirect.js";
import { addAlias, removeAlias } from "../../../lib/settings.js";
import { blobsStore } from "../../../lib/store.js";

// Adds or removes an extra crew name that counts as the club. Admin only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const store = blobsStore();
  if (name) {
    const settings = await store.getSettings();
    await store.putSettings(
      form.get("action") === "remove" ? removeAlias(settings, name) : addAlias(settings, name),
    );
  }
  return redirect(backTo(form.get("back")), 303);
};

import type { APIRoute } from "astro";
import { backTo, withError } from "../../../lib/admin-redirect.js";
import { clubIsSetUp, saveClub, withAlias, withoutAlias } from "../../../lib/club-settings.js";
import { club } from "../../../lib/config.js";
import { blobsStore } from "../../../lib/store.js";

// Adds or removes a crew name that counts as the club, in the club settings. Admin only
// (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const back = backTo(form.get("back"));
  if (!name) return redirect(back, 303);
  if (!clubIsSetUp()) {
    return redirect(withError(back, "Save your club settings first, then add names here."), 303);
  }
  const next = form.get("action") === "remove" ? withoutAlias(club, name) : withAlias(club, name);
  const problem = await saveClub(blobsStore(), next);
  return redirect(problem ? withError(back, problem) : back, 303);
};

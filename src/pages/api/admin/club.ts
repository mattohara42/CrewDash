import type { APIRoute } from "astro";
import { withError, withFlag } from "../../../lib/admin-redirect.js";
import { checkClub, clubFromForm, useClub } from "../../../lib/club-settings.js";
import { blobsStore } from "../../../lib/store.js";

const BACK = "/admin/club";

// Saves the club's settings. Admin only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const checked = checkClub(clubFromForm((name) => String(form.get(name) ?? "").trim()));
  if ("error" in checked) return redirect(withError(BACK, checked.error), 303);
  await blobsStore().putClub(checked.club);
  useClub(checked.club);
  return redirect(withFlag(BACK, "saved"), 303);
};

import type { APIRoute } from "astro";
import { withError, withFlag } from "../../../lib/admin-redirect.js";
import { clubFromForm, saveClub } from "../../../lib/club-settings.js";
import { blobsStore } from "../../../lib/store.js";

const BACK = "/admin/club";

// Saves the club's settings. Admin only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const problem = await saveClub(
    blobsStore(),
    clubFromForm((name) => String(form.get(name) ?? "").trim()),
  );
  return redirect(problem ? withError(BACK, problem) : withFlag(BACK, "saved"), 303);
};

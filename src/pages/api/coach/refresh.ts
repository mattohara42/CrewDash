import type { APIRoute } from "astro";
import { backTo, withError, withFlag } from "../../../lib/admin-redirect.js";
import { refreshAndNotify } from "../../../lib/notify-run.js";
import { blobsStore } from "../../../lib/store.js";

// Fetches a stored regatta's results now, without waiting for the scheduled refresh.
// Coaches and admins only. Only regattas already added can be refreshed here.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const store = blobsStore();
  if (!(await store.get(id))) return redirect("/", 303);
  try {
    await refreshAndNotify(id, store);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetching the results failed.";
    return redirect(withError(`/regatta/${id}`, message), 303);
  }
  return redirect(withFlag(backTo(form.get("back"), `/regatta/${id}`), "refreshed"), 303);
};

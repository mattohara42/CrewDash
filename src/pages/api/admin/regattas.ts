import type { APIRoute } from "astro";
import { regattaIdFrom } from "../../../crewtimer/fetch.js";
import { fetchAndStore } from "../../../lib/refresh.js";
import { blobsStore } from "../../../lib/store.js";

// Adds a regatta, or refreshes it if it's already stored. Admin only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = regattaIdFrom(String(form.get("link") ?? ""));
  if (!id) {
    return redirect(
      `/admin?${new URLSearchParams({ error: "That isn't a CrewTimer regatta link." })}`,
      303,
    );
  }
  try {
    await fetchAndStore(id, blobsStore());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetching the regatta failed.";
    return redirect(`/admin?${new URLSearchParams({ error: message })}`, 303);
  }
  return redirect(`/regatta/${id}`, 303);
};

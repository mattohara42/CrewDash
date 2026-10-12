import type { APIRoute } from "astro";
import { regattaIdFrom } from "../../../crewtimer/fetch.js";
import { notifyFetched } from "../../../lib/notify-run.js";
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
  const store = blobsStore();
  let fetched;
  try {
    fetched = await fetchAndStore(id, store);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetching the regatta failed.";
    return redirect(`/admin?${new URLSearchParams({ error: message })}`, 303);
  }
  // A refresh that turns up new results notifies followers, same as the scheduled one.
  // The regatta is already saved, so a notification failure is logged, not shown as an error.
  try {
    await notifyFetched([fetched], store);
  } catch (err) {
    console.error("Notifying followers failed:", err);
  }
  return redirect(`/regatta/${id}`, 303);
};

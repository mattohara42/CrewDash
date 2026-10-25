import type { APIRoute } from "astro";
import { backTo } from "../../../lib/admin-redirect.js";
import { seriesName } from "../../../lib/history.js";
import { blobsStore } from "../../../lib/store.js";
import { NEW_VENUE, setSeriesVenue } from "../../../lib/venues.js";

// Sets the series a regatta belongs to and the venue for that series. Blank series goes
// back to the suggested name. The venue applies to every year of the series. Admin only.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const store = blobsStore();
  const record = await store.get(String(form.get("id") ?? ""));
  if (!record) return redirect(backTo(form.get("back")), 303);

  const updated = { ...record, series: String(form.get("series") ?? "").trim() || undefined };
  await store.put(updated);
  const series = seriesName(updated);
  const venue = form.get("venue");
  if (venue === NEW_VENUE) {
    // The venue editor links the new venue to this series when it's saved.
    return redirect(`/admin/venues?${new URLSearchParams({ series })}#new-venue`, 303);
  }
  if (typeof venue === "string") {
    await store.putVenues(setSeriesVenue(await store.getVenues(), series, venue));
  }
  return redirect(backTo(form.get("back")), 303);
};

import type { APIRoute } from "astro";
import { backTo, withError } from "../../../lib/admin-redirect.js";
import { blobsStore } from "../../../lib/store.js";
import {
  MAX_TEXT,
  deleteVenue,
  safeUrl,
  parsePlaces,
  saveVenue,
  setSeriesVenue,
} from "../../../lib/venues.js";

const BACK = "/admin/venues";

// Venue guides, series links and club tips. Admin only (see middleware).
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const back = backTo(form.get("back"), BACK);
  const store = blobsStore();
  const data = await store.getVenues();

  switch (field("action")) {
    case "save": {
      const name = field("name");
      if (!name) return redirect(withError(back, "A venue needs a name."), 303);
      const parsed = parsePlaces(field("places"));
      if ("error" in parsed) {
        return redirect(
          withError(
            back,
            `Couldn't read this place: "${parsed.error}". Use "Label: lat, lon" or "Label: map link".`,
          ),
          303,
        );
      }
      const km = Number(field("courseLengthKm"));
      await store.putVenues(
        saveVenue(data, {
          id: field("id") || undefined,
          name,
          courseLengthM: field("courseLengthKm") && km > 0 ? Math.round(km * 1000) : null,
          places: parsed.places,
          notes: field("notes").slice(0, MAX_TEXT),
        }),
      );
      break;
    }
    case "delete":
      await store.putVenues(deleteVenue(data, field("id")));
      break;
    case "series":
      await store.putVenues(setSeriesVenue(data, field("series"), field("venue")));
      break;
    case "tips":
      if (field("chatUrl") && !safeUrl(field("chatUrl"))) {
        return redirect(withError(back, "The chat link needs to start with https://"), 303);
      }
      await store.putVenues({
        ...data,
        clubTips: field("clubTips").slice(0, MAX_TEXT),
        chatUrl: safeUrl(field("chatUrl")),
      });
      break;
  }
  return redirect(back, 303);
};

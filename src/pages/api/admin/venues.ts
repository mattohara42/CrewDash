import type { APIRoute } from "astro";
import { backTo, withError } from "../../../lib/admin-redirect.js";
import { blobsStore } from "../../../lib/store.js";
import {
  MAX_TEXT,
  deleteVenue,
  parseBearing,
  safeUrl,
  parsePlaces,
  saveVenue,
  setSeriesVenue,
} from "../../../lib/venues.js";

const BACK = "/admin/venues";

// Venue guides and club tips. Series links are set from the admin page's regatta cards. Admin only (see middleware).
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
            `Nothing was saved. Couldn't read this place: "${parsed.error}". Use "Label: lat, lon" or "Label: map link".`,
          ),
          303,
        );
      }
      const km = Number(field("courseLengthKm"));
      const bearing = parseBearing(field("courseBearing"));
      if (bearing === undefined) {
        return redirect(
          withError(
            back,
            "Course direction should be a compass point like SW, or degrees from 0 to 360.",
          ),
          303,
        );
      }
      let saved = saveVenue(data, {
        id: field("id") || undefined,
        name,
        courseLengthM: field("courseLengthKm") && km > 0 ? Math.round(km * 1000) : null,
        courseBearing: bearing,
        places: parsed.places,
        notes: field("notes").slice(0, MAX_TEXT),
      });
      // A venue added from a regatta's "New venue..." option is linked to its series,
      // then the admin goes back to the regatta list.
      const linkSeries = field("linkSeries");
      if (linkSeries && !field("id")) {
        saved = setSeriesVenue(saved, linkSeries, saved.venues.at(-1)!.id);
        await store.putVenues(saved);
        return redirect("/admin", 303);
      }
      await store.putVenues(saved);
      break;
    }
    case "delete":
      await store.putVenues(deleteVenue(data, field("id")));
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

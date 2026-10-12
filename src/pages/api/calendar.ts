import type { APIRoute } from "astro";
import { loadContext } from "../../lib/context.js";
import { seriesName } from "../../lib/history.js";
import { regattaCalendar } from "../../lib/ics.js";
import { venueForSeries } from "../../lib/venues.js";

// The club's events at one regatta as a calendar file. Members only (see middleware).
export const GET: APIRoute = async ({ url }) => {
  const { store, records, club } = await loadContext();
  const record = records.find((r) => r.regatta.id === url.searchParams.get("id"));
  if (!record) return new Response("Regatta not found", { status: 404 });
  const venue = venueForSeries(await store.getVenues(), seriesName(record));
  return new Response(regattaCalendar(record, club, venue), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${record.regatta.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
};

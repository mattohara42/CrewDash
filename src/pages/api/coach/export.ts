import type { APIRoute } from "astro";
import { loadContext } from "../../../lib/context.js";
import { resultsCsv } from "../../../lib/csv.js";
import { regattasInSeason, seasonLabel, seasonsRaced } from "../../../lib/history.js";

// Downloads a season's club results as CSV. Coaches and admins only (it lists stroke names).
export const GET: APIRoute = async ({ url }) => {
  const { records, club } = await loadContext();
  const years = seasonsRaced(records, club.seasonStartMonth);
  const asked = url.searchParams.get("year");
  const year = asked && years.includes(asked) ? asked : years[0];
  const csv = year ? resultsCsv(regattasInSeason(records, year, club.seasonStartMonth), club) : "";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="results-${year ? seasonLabel(year, club.seasonStartMonth) : "none"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};

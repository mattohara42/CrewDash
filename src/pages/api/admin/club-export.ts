import type { APIRoute } from "astro";
import { club } from "../../../lib/config.js";

// Downloads the club's settings as a file, because Blobs keeps no history. It's in
// club.json's shape, so it can also be committed as a fork's starting values. Admin only.
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(club, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="club.json"',
      "Cache-Control": "no-store",
    },
  });

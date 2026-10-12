import type { APIRoute } from "astro";
import { blobsStore } from "../../../lib/store.js";

// Downloads venue guides and club tips as a file, because Blobs keeps no history. Admin only.
export const GET: APIRoute = async () => {
  const data = await blobsStore().getVenues();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="crewdash-venues-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
};

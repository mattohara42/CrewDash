import type { APIRoute } from "astro";
import { backTo } from "../../../lib/admin-redirect.js";
import { lineupKey, setLineup } from "../../../lib/lineups.js";
import { blobsStore } from "../../../lib/store.js";

// Sets or clears one boat's lineup. Coaches and admins only (see middleware).
export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "");
  const id = field("id");
  const store = blobsStore();
  if (await store.get(id)) {
    const lineups = await store.getLineups(id);
    await store.putLineups(
      id,
      setLineup(lineups, lineupKey(field("event"), field("bow")), {
        seats: field("seats"),
        cox: field("cox"),
        from: locals.role === "admin" ? "admin" : "coach",
      }),
    );
  }
  return redirect(backTo(form.get("back"), `/regatta/${id}`), 303);
};
